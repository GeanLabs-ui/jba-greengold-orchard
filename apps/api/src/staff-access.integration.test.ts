import { Hono } from 'hono';
import { deleteIndependentEntity } from './modules/entity-deletion.js';
import { mutateSalesRecord } from './modules/sales-records.js';
import { mutateInventoryMovement } from './modules/inventory-corrections.js';
import postgres from 'postgres';
import { jwtVerify } from 'jose';
import { describe, expect, it, vi } from 'vitest';
import { createDatabase } from './db.js';
import { loadSession, type AppVariables } from './middleware/auth.js';
import auth from './modules/auth.js';
import entities from './modules/entities.js';
import farms from './modules/farms.js';
import { randomToken, sha256, LOCAL_SESSION_COOKIE } from './security.js';
import { workspacePageDefaults } from 'mango-farm-authorization';

vi.mock('./db.js', () => ({ createDatabase: vi.fn(), closeDatabase: vi.fn() }));
vi.mock('jose', () => ({ createRemoteJWKSet: vi.fn(), jwtVerify: vi.fn() }));
declare const process: { env: Record<string, string | undefined> };

describe.skipIf(!process.env.STAFF_ACCESS_DATABASE_TEST)('local staff lifecycle and delegated page access', () => {
  it('joins multiple staff, synchronizes identities and counts, honors grants, and isolates organizations', async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost','127.0.0.1'].includes(url.hostname) || !['15432', '15435'].includes(url.port) || url.pathname !== '/staff_access_test') throw Error('Isolated local test database required');
    const db = postgres(url.toString(), { max: 1, prepare: false });
    const rollback = new Error('ROLLBACK_STAFF_ACCESS_FIXTURES');
    try {
      await db.begin(async tx => {
        Object.assign(tx, { begin: tx.savepoint });
        vi.mocked(createDatabase).mockReturnValue(tx as never);
        const id = () => crypto.randomUUID();
        const org = id(), otherOrg = id(), admin = id(), employee = id(), foreignEmployee = id();
        await tx`INSERT INTO organizations (id,name,slug) VALUES (${org},'Local fixture',${org}),(${otherOrg},'Other fixture',${otherOrg})`;
        await tx`INSERT INTO users (id,email,role,status) VALUES (${admin},${`${admin}@example.test`},'super_admin','active')`;
        await tx`INSERT INTO organization_members (organization_id,user_id,role) VALUES (${org},${admin},'super_admin')`;
        const email1 = `${id()}@example.test`, email2 = `${id()}@example.test`;
        await tx`INSERT INTO entity_records (id,entity_name,organization_id,data) VALUES
          (${employee},'Employee',${org},${tx.json({email:email1,full_name:'Original HR name',status:'active',notes:'Preserve HR notes'})}),
          (${foreignEmployee},'Employee',${otherOrg},${tx.json({email:email1,full_name:'Other organization name',status:'active'})})`;
        const farm = id(), foreignFarm = id(), block = id(), foreignBlock = id();
        await tx`INSERT INTO farms (id,farm_code,name,organization_id) VALUES (${farm},${farm},'Local farm',${org}),(${foreignFarm},${foreignFarm},'Other farm',${otherOrg})`;
        await tx`INSERT INTO farm_blocks (id,farm_id,block_code,name) VALUES (${block},${farm},${block},'Local block'),(${foreignBlock},${foreignFarm},${foreignBlock},'Other block')`;
        const app = new Hono<{Bindings:Env;Variables:AppVariables}>();
        app.use('*', loadSession()); app.route('/auth',auth); app.route('/entities',entities); app.route('/',farms);
        const env = {APP_ENV:'local',GOOGLE_CLIENT_ID:'fixture',RESEND_API_KEY:'fixture',EMAIL_FROM:'Fixture <test@example.test>',PASSWORD_RESET_URL:'https://fixture.example.test/reset-password'} as unknown as Env;
        const csrf = 'fixture-csrf';
        const session = async (userId: string) => { const token = randomToken(); await tx`INSERT INTO sessions (id,user_id,token_hash,csrf_token,expires_at) VALUES (${id()},${userId},${await sha256(token)},${csrf},now()+interval '1 hour')`; return `${LOCAL_SESSION_COOKIE}=${token}`; };
        const adminCookie = await session(admin);
        const req = (path:string,cookie=adminCookie,body?:object,method=body?'POST':'GET') => app.request(path,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':csrf},...(body?{body:JSON.stringify(body)}:{})},env);
        const resend = vi.fn<typeof fetch>().mockResolvedValue(Response.json({id:'fixture-email'}));
        resend.mockResolvedValueOnce(Response.json({message:'Slow down'},{status:429,headers:{'Retry-After':'0'}}));
        vi.stubGlobal('fetch',resend);
        const fullAccess = workspacePageDefaults.admin!;
        const invite1 = await req('/auth/staff-invitations',adminCookie,{email:email1,fullName:'First person',role:'finance_officer',pageAccess:fullAccess,employeeId:employee});
        expect(invite1.status).toBe(201);
        expect((await req('/auth/staff-invitations',adminCookie,{email:email1,role:'finance_officer'})).status).toBe(409);
        const invite2 = await req('/auth/staff-invitations',adminCookie,{email:email2,fullName:'Second person',role:'finance_officer',pageAccess:fullAccess});
        expect(invite2.status).toBe(201);
        expect(resend).toHaveBeenCalledTimes(3);
        const header = (i:number) => new Headers(resend.mock.calls[i][1]?.headers).get('Idempotency-Key');
        expect(header(0)).toBe(header(1)); expect(header(2)).not.toBe(header(1));
        const tokenFor = (i:number) => { const message = JSON.parse(String(resend.mock.calls[i][1]?.body));return new URL(message.html.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&')).searchParams.get('token'); };
        const accept = async (email:string,token:string|null) => {
          vi.mocked(jwtVerify).mockResolvedValue({payload:{sub:`google-${email}`,email,email_verified:true,name:'Google fixture'}} as never);
          return req('/auth/staff-invitations/accept','',{token,credential:'x'.repeat(120)});
        };
        const joined1 = await accept(email1,tokenFor(1)); expect(joined1.status).toBe(200);
        const staff1 = (await joined1.json() as any).data.user.id as string;
        const joined2 = await accept(email2,tokenFor(2)); expect(joined2.status).toBe(200);
        const staff2 = (await joined2.json() as any).data.user.id as string;
        expect((await accept(email2,tokenFor(2))).status).toBe(422);
        expect(await tx`SELECT 1 FROM organization_members WHERE user_id=${staff2} AND organization_id=${org}`).toHaveLength(1);
        expect(await tx`SELECT 1 FROM entity_records WHERE entity_name='Employee' AND data->>'user_id'=${staff2} AND organization_id=${org}`).toHaveLength(1);
        const staffCookie = await session(staff1);
        for (const entity of ['FarmBlock','DailyActivity','FarmProcessLog','Equipment','Employee','Attendance','Customer','Order','Invoice','Payment','Expense','Notification']) {
          expect((await req(`/entities/${entity}`,staffCookie)).status,entity).toBe(200);
        }
        expect((await req('/farms',staffCookie)).status).toBe(200);
        const visibleBlocks = (await (await req('/entities/FarmBlock',staffCookie)).json() as any).data;
        expect(visibleBlocks.some((b:any)=>b.id===block)).toBe(true); expect(visibleBlocks.some((b:any)=>b.id===foreignBlock)).toBe(false);
        expect((await req('/entities/Issue',staffCookie,{title:'Fixture issue'})).status).toBe(201);
        expect((await req('/auth/staff-users',staffCookie)).status).toBe(403);
        const renamed = await req('/auth/me',staffCookie,{fullName:'Updated Staff Name'},'PATCH'); expect(renamed.status).toBe(200);
        const [stored] = await tx`SELECT data FROM entity_records WHERE id=${employee}`;
        expect(stored.data).toMatchObject({full_name:'Updated Staff Name',first_name:'Updated',last_name:'Staff Name',notes:'Preserve HR notes'});
        expect((await tx`SELECT data FROM entity_records WHERE id=${foreignEmployee}`)[0].data.full_name).toBe('Other organization name');
        const employeeList = (await (await req('/entities/Employee',staffCookie)).json() as any).data;
        expect(employeeList.find((e:any)=>e.id===employee).full_name).toBe('Updated Staff Name');
        const summary = (await (await req('/auth/staff-summary',staffCookie)).json() as any).data;
        expect(summary).toEqual({total:3,active:3}); // one administrator and two accepted staff, no linked-record duplicates
        // Previously accepted staff without membership still resolve the unambiguous inviter organization.
        await tx`DELETE FROM organization_members WHERE user_id=${staff1}`;
        const legacyBlocks = (await (await req('/entities/FarmBlock',staffCookie)).json() as any).data;
        expect(legacyBlocks.some((b:any)=>b.id===block)).toBe(true);
        expect(legacyBlocks.some((b:any)=>b.id===foreignBlock)).toBe(false);
        expect((await (await req('/auth/staff-summary',staffCookie)).json() as any).data).toEqual({total:3,active:3});
        await tx`UPDATE users SET page_access='["farm_daily_activities"]'::jsonb WHERE id=${staff1}`;
        expect((await req('/entities/FarmBlock',staffCookie)).status).toBe(200);
        expect((await req('/entities/Employee',staffCookie)).status).toBe(403);
        expect((await req('/entities/Payment',staffCookie)).status).toBe(403);
        await tx`UPDATE users SET page_access='[]'::jsonb WHERE id=${staff1}`;
        expect((await req('/entities/FarmBlock',staffCookie)).status).toBe(403);
        expect((await req('/farms',staffCookie)).status).toBe(403);
        expect((await req('/entities/Expense',staffCookie)).status).toBe(403);
        expect((await req('/auth/staff-directory',staffCookie)).status).toBe(403);
        const customer=id();await tx`INSERT INTO users (id,email,role,status,page_access,email_verified_at) VALUES (${customer},${`${customer}@example.test`},'customer','active',${tx.json(fullAccess)},now())`;
        expect((await req('/entities/FarmBlock',await session(customer))).status).toBe(403);
        await tx`UPDATE users SET status='inactive' WHERE id=${staff2}`;
        expect((await req('/entities/FarmBlock',await session(staff2))).status).toBe(401);
        // Exercise actual correction SQL and preservation on isolated fixtures.
        const actor = { id:admin,email:`${admin}@example.test`,full_name:'Fixture admin',role:'super_admin' as const,pageAccess:null,status:'active',organizationId:org };
        const payment=id(), invoice=id(), stock=id(), movement=id(), unlinkedEmployee=id();
        const add=async (recordId:string,entity:string,data:Record<string,any>)=>tx`INSERT INTO entity_records(id,entity_name,organization_id,data) VALUES(${recordId},${entity},${org},${tx.json(data)})`;
        await add(invoice,'Invoice',{invoice_number:'FIXTURE',total_amount:100,amount_paid:25,balance_due:75,status:'partial',currency:'GHS',notes:'Preserve invoice notes'});
        await add(payment,'Payment',{amount:25,status:'completed',currency:'GHS',invoice_id:invoice});
        await mutateSalesRecord(tx as never,'Payment','update',payment,{amount:30.25},actor,'127.0.0.1');
        expect((await tx`SELECT data FROM entity_records WHERE id=${invoice}`)[0].data).toMatchObject({amount_paid:30.25,balance_due:69.75,notes:'Preserve invoice notes'});
        await add(stock,'StockItem',{product_name:'Fixture mango',warehouse_name:'Fixture warehouse',quantity_on_hand:10,quantity_reserved:0});
        await mutateInventoryMovement(tx as never,'create',movement,{stock_item_id:stock,movement_type:'in',quantity:5},actor,'127.0.0.1');
        await mutateInventoryMovement(tx as never,'update',movement,{quantity:7},actor,'127.0.0.1');
        expect((await tx`SELECT data FROM entity_records WHERE id=${stock}`)[0].data.quantity_on_hand).toBe(17);
        await add(unlinkedEmployee,'Employee',{email:`${id()}@example.test`,full_name:'Independent fixture'});
        expect(await deleteIndependentEntity(tx as never,'Employee',unlinkedEmployee,actor,'127.0.0.1')).toEqual({success:true});
        await expect(deleteIndependentEntity(tx as never,'Employee',employee,actor,'127.0.0.1')).rejects.toThrow(/staff (account|invitation)/);
        throw rollback;
      });
    } catch(error) {if(error!==rollback)throw error;}
    finally {vi.unstubAllGlobals();await db.end();}
  },30000);
});
