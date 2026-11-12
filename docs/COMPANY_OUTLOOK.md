# Company Outlook setup

The admin Calendar page reads the primary Microsoft 365 calendar and Inbox for `info@jbagreengold.com`. Super Admins can send replies from the mailbox. Outlook keeps the original messages, events, and sent replies. Calendar edits and opening mail attachments take place in Outlook. The Farm schedule tab provides the existing production calendar and subscription feed.

## Microsoft 365

1. Confirm that `info@jbagreengold.com` is the primary address of a user or shared mailbox in Exchange Online. Create a dedicated single-tenant app registration in Microsoft Entra and record its tenant ID, client ID, and client secret **value**. Find the service principal object ID under **Enterprise applications**.
2. In Exchange Online PowerShell, scope the app to that mailbox and grant the three roles below. Use Exchange application RBAC for these roles. Tenant-wide Microsoft Graph application permissions in Entra are additive, so leave those permissions unassigned for this app.

   ```powershell
   Connect-ExchangeOnline
   $clientId = '<application-client-id>'
   $servicePrincipalId = '<enterprise-application-object-id>'
   $mailbox = Get-EXOMailbox -PrimarySmtpAddress 'info@jbagreengold.com' -ErrorAction Stop
   $mailboxId = $mailbox.ExternalDirectoryObjectId
   if (-not $mailboxId -or $mailbox.PrimarySmtpAddress -ne 'info@jbagreengold.com') {
     throw 'Could not resolve the company mailbox and its Entra object ID.'
   }
   $scope = 'JBA Company Outlook Mailbox'
   New-ServicePrincipal -AppId $clientId -ObjectId $servicePrincipalId -DisplayName 'JBA Company Outlook'
   New-ManagementScope -Name $scope -RecipientRestrictionFilter "ExternalDirectoryObjectId -eq '$mailboxId'"
   foreach ($role in @('Application Calendars.Read', 'Application Mail.Read', 'Application Mail.Send')) {
     New-ManagementRoleAssignment -App $servicePrincipalId -Role $role -CustomResourceScope $scope
   }
   Test-ServicePrincipalAuthorization -Identity $servicePrincipalId -Resource 'info@jbagreengold.com'
   ```

3. Verify that the three roles show `InScope=True` for the company mailbox. Run the same authorization test against a different mailbox and confirm the roles are out of scope. Check Entra separately for tenant-wide grants. [Exchange Online application RBAC](https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac)

## Cloudflare Worker

Set these bindings in the Worker for the intended environment. Use a separate test app and mailbox for staging or local development.

| Worker binding | Value |
| --- | --- |
| `COMPANY_OUTLOOK_TENANT_ID` | Entra directory (tenant) ID |
| `COMPANY_OUTLOOK_CLIENT_ID` | Entra application (client) ID |
| `COMPANY_OUTLOOK_CLIENT_SECRET` | Entra client secret value |
| `COMPANY_OUTLOOK_MAILBOX_ID` | `ExternalDirectoryObjectId` of the Exchange mailbox |

Use the Worker secrets interface or enter the values when prompted by Wrangler. Run the following from the repository root after the production release is ready.

```powershell
foreach ($binding in @('COMPANY_OUTLOOK_TENANT_ID', 'COMPANY_OUTLOOK_CLIENT_ID', 'COMPANY_OUTLOOK_CLIENT_SECRET', 'COMPANY_OUTLOOK_MAILBOX_ID')) {
  npx wrangler secret put $binding --config apps/api/wrangler.jsonc --env production
}
```

Open `/admin/calendar` as a Super Admin and compare a known event with Outlook. Open **Company inbox** and compare a known message. For a send check, reply to a message from an account you control and confirm it arrives from `info@jbagreengold.com` and appears in the mailbox's Sent Items. Microsoft may take time to apply new role assignments. [Microsoft Graph reply behavior](https://learn.microsoft.com/en-us/graph/api/message-reply?view=graph-rest-1.0)

**Settings → Microsoft 365 connection** checks whether the Worker has the required bindings, whether Microsoft accepts the credentials, and whether the app can read the inbox and calendar. This check does not send an email.

## Department addresses and inboxes

1. Create an Exchange shared mailbox for each department address. Check whether the address is already an alias on an existing recipient before creating the mailbox. If it is already in use, coordinate the transfer of that address in Exchange. [Create a shared mailbox](https://learn.microsoft.com/en-us/microsoft-365/admin/email/create-a-shared-mailbox)
2. In Exchange, use internal forwarding to `info@jbagreengold.com` and enable delivery to both addresses. This gives the department its own incoming copy and delivers a copy to the company inbox. [Configure email forwarding](https://learn.microsoft.com/en-us/exchange/recipients-in-exchange-online/manage-user-mailboxes/configure-email-forwarding)
3. For each department, create a scope for the shared mailbox and grant the existing app `Application Mail.Read` and `Application Mail.Send`. Use the service principal ID from the company setup.

   ```powershell
   $departmentEmail = '<department-address>@jbagreengold.com'
   $departmentMailbox = Get-EXOMailbox -PrimarySmtpAddress $departmentEmail -ErrorAction Stop
   $departmentMailboxId = $departmentMailbox.ExternalDirectoryObjectId
   if (-not $departmentMailboxId -or $departmentMailbox.PrimarySmtpAddress -ne $departmentEmail) {
     throw 'Could not resolve the department mailbox and its Entra object ID.'
   }
   $scope = "JBA $departmentEmail"
   New-ManagementScope -Name $scope -RecipientRestrictionFilter "ExternalDirectoryObjectId -eq '$departmentMailboxId'"
   foreach ($role in @('Application Mail.Read', 'Application Mail.Send')) {
     New-ManagementRoleAssignment -App $servicePrincipalId -Role $role -CustomResourceScope $scope
   }
   Test-ServicePrincipalAuthorization -Identity $servicePrincipalId -Resource $departmentEmail
   ```

4. In **Settings → Department inboxes**, select the department, enter its primary address and Exchange mailbox object ID, choose the staff who can read and reply, and save. Give those users access to the Calendar page in the staff permissions screen. Super Admins can open all configured department inboxes in their workspace.
5. Verify with a controlled test message addressed to one department. Confirm that it appears in that department and the company inbox. Sign in as a staff account from a different department and verify that it cannot open the first department's inbox. Check that the department’s reply is sent from the department address.
