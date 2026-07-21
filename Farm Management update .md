**Build: Farm Daily Activities Management Module**

Add a full **Farm Daily Activities Management** module inside the admin system. It must sync with **Farm Management, Inventory, HR, Finance, Procurement, Logistics, Export, Documents, Reports, and Analytics**.

The farm is already mature and harvesting has started, so the module must focus on **daily execution, harvesting, labour, equipment, fertilizers, chemicals, quality control, costs, and reporting**.

**1\. Main Navigation**

Inside **Farm Management**, add these tabs:

Overview

Fields

Daily Activities

Work Orders

Harvest Operations

Labour

Equipment

Chemicals & Fertilizers

Inventory Usage

Quality Control

Waste & Losses

Weather Log

Expenses

Reports

Notes

Compliance

Also add a sidebar shortcut:

Production > Farm Daily Activities

**2\. Daily Activities**

This is the main operational screen.

**Required Features**

Users must be able to:

Create daily activity

Assign activity to farm/block/team

Select activity category

Set date

Set start time

Set end time

Assign supervisor

Assign workers

Attach equipment

Record fuel usage

Record fertilizer usage

Record chemical usage

Record harvest quantity

Record output by worker/team

Upload photos/videos

Add GPS/location

Add notes

Set status

Generate daily report

Export to PDF/Excel

**Activity Categories**

Land Clearing

Weeding

Pruning

Irrigation

Spraying

Fertilizer Application

Pest Inspection

Disease Inspection

Harvesting

Collection

Sorting

Washing

Packing

Cold Storage Transfer

Loading

Transport to Warehouse

Equipment Maintenance

Fence Repair

Drain Cleaning

Road Maintenance

General Farm Work

**Activity Status**

Planned

Assigned

In Progress

Completed

Cancelled

Delayed

Requires Review

Approved

**3\. Daily Activity Form**

Build a full form with these fields:

Activity ID

Date

Farm

Block/Field

Activity Category

Activity Title

Description

Priority

Supervisor

Assigned Team

Assigned Workers

Start Time

End Time

Total Hours

Equipment Used

Fuel Used

Fertilizer Used

Chemical Used

Quantity Used

Unit

Harvest Quantity

Grade A Quantity

Grade B Quantity

Rejected Quantity

Crates Used

Destination

Cost

Photos

Videos

GPS Coordinates

Weather Condition

Safety Incident

Notes

Status

Approved By

Created By

Updated By

Rules:

Total Hours = End Time - Start Time

Cost = Labour Cost + Equipment Cost + Fuel Cost + Input Cost + Transport Cost

Harvest Quantity = Grade A + Grade B + Rejected Quantity

Activity cannot be approved unless required usage logs are completed

Chemical application must require weather condition

Equipment usage must require operator and condition

Harvest activity must require grade quantities

**4\. Work Orders**

Every planned farm job should become a work order.

**Fields**

Work Order ID

Title

Farm

Block

Category

Priority

Supervisor

Assigned Team

Workers

Scheduled Date

Start Time

End Time

Equipment Required

Inputs Required

Estimated Cost

Actual Cost

Status

Completion Notes

Photos

Approved By

**Status**

Draft

Scheduled

Assigned

In Progress

Completed

Cancelled

Overdue

Approved

Work order can convert into a completed daily activity.

**5\. Harvest Operations**

Because harvesting has started, this must be a major feature.

**Required Screens**

Harvest Dashboard

Daily Harvest Log

Harvest by Farm

Harvest by Block

Harvest by Worker

Harvest Quality Grades

Crate Tracking

Warehouse Destination

Truck Loading

Harvest Reports

**Daily Harvest Fields**

Harvest ID

Date

Farm

Block

Team

Supervisor

Picker/Worker

Mango Variety

Quantity Harvested kg

Grade A kg

Grade B kg

Rejected kg

Crates Used

Average Crate Weight

Destination

Warehouse

Truck

Driver

Batch Number

QR Code

Photos

Notes

Status

**Harvest Rules**

Total Harvest = Grade A + Grade B + Rejected

Grade A can go to Export

Grade B can go to Local Sales/Processing

Rejected goes to Waste/Losses

Harvest batch creates Inventory Stock

Harvest batch links to Warehouse

Harvest batch can link to Export Order

Harvest batch generates QR traceability code

**6\. Labour Management**

Track daily farm workers and productivity.

**Features**

Daily attendance

Clock in

Clock out

Team assignment

Supervisor assignment

Activity assignment

Worker output

Overtime

Daily wage calculation

Payment status

Worker productivity report

**Fields**

Worker ID

Worker Name

Role

Team

Farm

Block

Date

Clock In

Clock Out

Hours Worked

Overtime Hours

Activity

Output kg

Output crates

Daily Rate

Piece Rate

Bonus

Deduction

Total Pay

Payment Status

Sync with:

HR employee profiles

Payroll

Finance expenses

Farm activities

Harvest operations

**7\. Equipment Management**

Track tools, machinery, and daily usage.

**Equipment Types**

Tractor

Sprayer

Cutlass

Hoe

Pruning Shears

Crates

Wheelbarrow

Generator

Water Pump

Pickup Truck

Scale

Sorting Table

Cold Room Equipment

Drone

**Equipment Fields**

Equipment ID

Equipment Name

Category

Serial Number

Farm Assigned

Current Location

Condition

Status

Assigned Operator

Purchase Date

Maintenance Schedule

Last Maintenance Date

Next Maintenance Date

Usage Hours

Fuel Type

Fuel Consumption

Notes

**Daily Equipment Usage**

Usage ID

Date

Equipment

Activity

Farm

Block

Operator

Start Time

End Time

Hours Used

Fuel Issued

Fuel Consumed

Opening Condition

Closing Condition

Damage Reported

Returned

Returned Time

Supervisor Approval

Rules:

Equipment cannot be double-booked for same time

Damaged equipment status changes to Needs Repair

Fuel consumption syncs with Inventory Usage and Finance

Maintenance due creates alert

**8\. Chemicals & Fertilizers**

Track all farm inputs.

**Features**

Input inventory

Chemical issue log

Fertilizer application log

Spray records

Batch tracking

Expiry tracking

Safety compliance

Application history

Reorder alerts

**Input Fields**

Input ID

Input Name

Type

Category

Supplier

Batch Number

Expiry Date

Stock Quantity

Unit

Storage Location

Safety Notes

Reorder Level

Status

**Application Fields**

Application ID

Date

Farm

Block

Activity

Input Name

Input Type

Quantity Issued

Quantity Used

Remaining Quantity

Unit

Applied By

Supervisor

Weather Condition

Wind Speed

Purpose

Target Pest/Disease

Application Method

Next Application Date

Photos

Notes

Status

Rules:

Quantity used deducts from Inventory

Expired chemicals cannot be used

Chemical application requires weather condition and wind speed

Spray records must be available for compliance and export audit

Low stock creates procurement request

**9\. Inventory Usage**

Every activity that consumes resources must update inventory.

Track:

Fertilizers

Chemicals

Fuel

Crates

Packaging materials

Protective gear

Tools

Spare parts

**Fields**

Usage ID

Date

Item

Item Category

Farm

Block

Activity

Quantity Issued

Quantity Used

Quantity Returned

Wastage

Unit Cost

Total Cost

Issued By

Received By

Approved By

Notes

Rules:

Stock = Opening Stock + Purchases - Usage - Waste

Usage must sync with activity cost

Low stock triggers alert

Critical stock triggers procurement request

**10\. Quality Control**

Track fruit quality from harvest to packing.

**Features**

Harvest inspection

Sorting inspection

Packing inspection

Export readiness inspection

Rejected fruit log

Photo evidence

QC approval

**Fields**

QC ID

Date

Batch Number

Farm

Block

Inspector

Stage

Total Quantity

Sample Size

Grade A kg

Grade B kg

Rejected kg

Defect Type

Defect Percentage

Fruit Size

Fruit Color

Ripeness Level

Disease Signs

Bruising

Export Approved

Photos

Notes

Status

Rules:

Export batch must pass QC

Rejected quantity moves to Waste/Losses

QC status affects inventory batch status

**11\. Waste & Losses**

Track rejected fruit and operational losses.

**Loss Types**

Rejected Fruit

Spoilage

Rot

Pest Damage

Transport Damage

Theft

Chemical Waste

Fuel Loss

Equipment Damage

Packaging Waste

**Fields**

Loss ID

Date

Farm

Block

Batch Number

Loss Type

Quantity

Unit

Estimated Value

Reason

Reported By

Approved By

Photos

Action Taken

Status

Rules:

Rejected harvest automatically creates waste record

Losses affect profitability reports

High losses trigger alert

**12\. Weather Log**

Daily farm weather must be recorded.

**Fields**

Weather ID

Date

Farm

Temperature

Humidity

Rainfall

Wind Speed

Cloud Cover

Soil Moisture

Weather Condition

Forecast

Recorded By

Source

Notes

Rules:

Spraying should warn if wind speed or rainfall risk is high

Weather log links to daily activity and spray records

**13\. Expenses**

Track daily operational cost.

**Expense Categories**

Labour

Fuel

Equipment Repair

Fertilizer

Chemical

Transport

Food/Meals

Packaging

Maintenance

Security

Miscellaneous

**Fields**

Expense ID

Date

Farm

Activity

Category

Description

Amount

Vendor

Payment Method

Receipt Upload

Approved By

Status

Rules:

Expenses sync to Finance module

Activity cost includes related expenses

Approved expenses update profit reports

**14\. Daily Reports**

The system must auto-generate a daily supervisor report.

**Report Content**

Farm

Date

Supervisor

Workers Present

Workers Absent

Activities Completed

Activities Pending

Harvest Quantity

Grade A

Grade B

Rejected

Equipment Used

Fuel Used

Fertilizers Used

Chemicals Used

Weather

Incidents

Losses

Expenses

Photos

Tomorrow’s Plan

Supervisor Signature

Manager Approval

Actions:

Generate PDF

Export Excel

Send to Admin

Approve Report

Reject Report

Add Comment

**15\. Dashboard KPIs**

Update the Farm Management dashboard with these KPIs:

Today’s Harvest kg

Grade A Harvest kg

Workers Present

Active Work Orders

Activities Completed Today

Equipment In Use

Fuel Used Today

Chemical Usage Today

Fertilizer Usage Today

Daily Farm Cost

Rejected Fruit kg

Pending QC

Warehouse Transfer kg

Trucks Loaded

**16\. Analytics**

Add dashboards for:

Harvest by Day

Harvest by Farm

Harvest by Block

Harvest by Worker

Grade A vs Grade B vs Rejected

Daily Labour Cost

Equipment Utilization

Fuel Consumption

Chemical Usage

Fertilizer Usage

Waste Trend

Farm Profitability

Productivity per Worker

Cost per kg harvested

Export-ready stock

**17\. Notifications & Alerts**

Create alerts for:

Low fertilizer stock

Low chemical stock

Low fuel stock

Expired chemical

Equipment maintenance due

Equipment damaged

Work order overdue

Activity awaiting approval

High rejected fruit rate

High daily expense

Spraying weather risk

Harvest target missed

QC failed

Truck loading pending

**18\. System Sync Rules**

The module must sync like this:

Daily Activity → Work Orders

Daily Activity → Labour

Daily Activity → Equipment Usage

Daily Activity → Inventory Usage

Daily Activity → Expenses

Daily Activity → Reports

Harvest → Inventory

Harvest → Quality Control

Harvest → Warehouse

Harvest → Export

Harvest → Sales

Harvest → Waste

Chemical/Fertilizer Usage → Inventory

Chemical/Fertilizer Usage → Compliance

Chemical/Fertilizer Usage → Procurement

Labour Attendance → HR

Labour Cost → Payroll

Labour Cost → Finance

Equipment Usage → Maintenance

Equipment Fuel → Inventory

Equipment Cost → Finance

Expenses → Finance

Reports → Documents

Reports → Analytics

**19\. Required UI Screens**

Build these screens fully:

Farm Operations Dashboard

Daily Activities List

Create Daily Activity

Daily Activity Details

Work Orders List

Create Work Order

Work Order Details

Harvest Dashboard

Daily Harvest Log

Create Harvest Entry

Harvest Batch Details

Labour Attendance

Worker Productivity

Equipment List

Equipment Details

Equipment Usage Log

Input Inventory

Chemical Application Log

Fertilizer Application Log

Inventory Usage Log

Quality Control List

QC Inspection Form

Waste & Losses List

Weather Log

Expense Log

Daily Supervisor Reports

Analytics Dashboard

Settings

**20\. Permissions**

Roles:

Admin

Farm Manager

Supervisor

Field Officer

Inventory Officer

HR Officer

Finance Officer

QC Officer

Driver

Worker

Permission examples:

Worker: View assigned tasks only

Supervisor: Create activities, log labour, upload photos

Farm Manager: Approve activities, reports, expenses

Inventory Officer: Issue inputs and equipment

QC Officer: Approve/reject batches

Finance Officer: Approve expenses

Admin: Full access

**21\. Data Model Summary**

Minimum tables/entities:

farms

farm\_blocks

daily\_activities

work\_orders

activity\_workers

activity\_equipment

activity\_inputs

harvest\_batches

harvest\_grades

workers

attendance

equipment

equipment\_usage

inputs

input\_usage

inventory\_items

inventory\_transactions

quality\_checks

waste\_losses

weather\_logs

expenses

daily\_reports

documents

notifications

approvals

audit\_logs

**22\. Critical Workflow**

**Harvest workflow**

Create Work Order

↓

Assign harvest team

↓

Workers clock in

↓

Harvest mangoes by block

↓

Record kg and crates

↓

Create harvest batch

↓

Sort and grade

↓

QC inspection

↓

Grade A → Export/Warehouse

Grade B → Local Sales/Processing

Rejected → Waste/Losses

↓

Inventory updated

↓

Finance cost updated

↓

Daily report generated

**Chemical/Fertilizer workflow**

Create spray/fertilizer activity

↓

Check weather

↓

Issue input from inventory

↓

Apply to farm block

↓

Record quantity used

↓

Update inventory

↓

Save compliance spray record

↓

Generate report

**Equipment workflow**

Assign equipment

↓

Issue to operator

↓

Record usage hours/fuel

↓

Return equipment

↓

Record condition

↓

If damaged → maintenance alert

↓

Cost syncs to finance

**Final Instruction to Agent**

Build this as a fully functional, synced admin module. Do not create isolated screens. Every activity must update related modules automatically: inventory, HR, finance, harvest, QC, equipment, documents, analytics, notifications, and reports.

The system should work as the operational backbone of a mature mango farm in Ghana where daily harvesting, sorting, labour, equipment, fertilizers, chemicals, fuel, and expenses are recorded every day.