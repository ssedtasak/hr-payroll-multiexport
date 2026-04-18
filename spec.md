# PRD: HR Payroll Multi-Export Web App

**Author:** Manus AI  
**Version:** 1.1  
**Date:** 2026-04-12

## 1. Executive Summary

เอกสารฉบับนี้เป็น PRD สำหรับ **web app ภายในองค์กร** ที่ให้ทีม HR กรอกข้อมูล payroll เพียงครั้งเดียว แล้วสามารถ **export ได้หลายปลายทาง** จากชุดข้อมูลเดียวกัน โดยอย่างน้อยต้องรองรับ 2 output หลัก ได้แก่ **ไฟล์ payroll สำหรับสำนักงานบัญชี** และ **ไฟล์ payroll upload สำหรับ KBank**

จากไฟล์ตัวอย่างที่ให้มา พบว่า output สำหรับสำนักงานบัญชีเป็น workbook หลายชีตที่แยกตามบริษัทหรือสาขา และมีโครงสร้าง payroll แบบละเอียด แยก **พนักงานประกันสังคม** กับ **พนักงานหัก ณ ที่จ่าย** พร้อมคอลัมน์รายรับ รายการหัก และยอดสุทธิ ขณะที่ไฟล์ KBank ทั้งสองตัวอย่างมีโครงสร้างเหมือนกันเกือบทั้งหมด คือเป็นชีตเดียวชื่อ `Transaction Upload` และมีเพียงข้อมูลที่จำเป็นต่อการโอนเงิน ได้แก่ **Bank Code, Account Number, Account Name, Amount และ Effective Date** รวมถึง summary จำนวนรายการและยอดรวมด้านบนของไฟล์

ดังนั้น product direction ที่เหมาะที่สุดคือทำระบบแบบ **single source of truth** กล่าวคือทีม HR กรอกข้อมูล payroll หนึ่งครั้ง จากนั้นระบบคำนวณยอดสุทธิของแต่ละพนักงาน แล้วเปิดให้เลือกว่าจะ export เป็น **Accounting Template**, **KBank Payroll Template**, หรือ **ทั้งสองแบบพร้อมกัน** วิธีนี้ลดงานซ้ำ ลดความเสี่ยงจากยอดไม่ตรงกันระหว่างไฟล์สองประเภท และตรงกับเป้าหมายเรื่องระบบที่ simple, minimal และ deploy ได้บน static hosting

## 2. Background and Problem Statement

ปัจจุบัน workflow payroll มีลักษณะเป็นงาน manual หลายชั้น กล่าวคือทีม HR ต้องรวบรวมข้อมูลเงินเดือน รายการหัก และข้อมูลการจ่ายเงิน ก่อนจะจัดทำไฟล์แยกกันตามผู้รับปลายทาง หากใช้ spreadsheet หลายไฟล์แยกกัน ปัญหาที่เกิดขึ้นบ่อยคือ **กรอกข้อมูลซ้ำหลายรอบ**, **ยอดสุทธิในไฟล์ธนาคารไม่ตรงกับไฟล์บัญชี**, **ข้อมูลบัญชีธนาคารพนักงานตกหล่น**, และ **การแก้ไขครั้งสุดท้ายไม่ถูก sync ไปทุกไฟล์**

จากไฟล์จริงที่แนบมา หลักฐานเชิงโครงสร้างชัดเจนว่า output ทั้งสองประเภทใช้คนละรูปแบบ แต่พึ่งพาแกนข้อมูลชุดเดียวกัน กล่าวคือฝั่งสำนักงานบัญชีต้องการ payroll detail เพื่อการบันทึกบัญชีและตรวจสอบ ส่วนฝั่ง KBank ต้องการรายการโอนเงินรายคนในรูปแบบ upload ที่ง่ายและตายตัว หากยังทำสองไฟล์แยกกันแบบ manual จะมีต้นทุน error สูงโดยไม่จำเป็น

> ปัญหาหลักที่ระบบนี้ต้องแก้ คือทำให้ HR กรอกข้อมูล payroll ครั้งเดียว แล้วแปลงเป็นหลาย output ได้อย่างสอดคล้องกัน โดยไม่ต้องจัดไฟล์ซ้ำและไม่ต้องกังวลว่ายอดสุทธิแต่ละปลายทางจะไม่ตรงกัน

## 3. Product Goal

เป้าหมายของผลิตภัณฑ์คือให้ทีม HR สามารถสร้าง payroll export ประจำงวดได้เร็วขึ้น แม่นขึ้น และตรวจสอบง่ายขึ้น ผ่าน 4 ขั้นตอนหลัก ได้แก่ **ตั้งค่างวดและหน่วยงาน**, **กรอกข้อมูลพนักงานและยอด payroll**, **ตรวจสอบยอดรวมและความครบถ้วน**, และ **เลือก export ตามปลายทางที่ต้องการ**

ในเชิงธุรกิจ ระบบนี้ไม่ได้ตั้งใจเป็น HRIS เต็มรูปแบบ แต่เป็น **internal payroll export utility** ที่ลดเวลางานหลังบ้าน ลดการแก้ไฟล์ซ้ำ และทำให้ทั้งสำนักงานบัญชีและธนาคารได้รับไฟล์ที่พร้อมใช้งานจากข้อมูลชุดเดียวกัน

## 4. Product Principles

ระบบนี้จะยึดหลัก **Japanese Operational Minimalism** เพราะเหมาะกับงานหลังบ้านที่ต้องการความเร็ว ความนิ่ง และความแม่นยำมากกว่าความหวือหวา หลักการออกแบบสำคัญคือผู้ใช้ต้องเข้าใจ workflow ได้ทันที, มองเห็นยอดสำคัญตลอดเวลา, เห็นจุดผิดพลาดในตำแหน่งที่ต้องแก้, และเลือก output ได้โดยไม่สับสนว่าข้อมูลชุดใดจะถูกนำไปใช้ที่ใด

ในเชิงผลิตภัณฑ์ หลักการนี้แปลเป็น 4 ข้อ คือหนึ่ง **กรอกครั้งเดียว ใช้ซ้ำได้หลาย output** สอง **ระบบคำนวณให้มากที่สุดเท่าที่ปลอดภัย** สาม **การ export ต้อง deterministic** และสี่ **โครงสร้างข้อมูลกลางต้องมาก่อน template ปลายทาง** เพื่อให้เพิ่ม output ใหม่ได้ในอนาคตโดยไม่ต้องเปลี่ยนวิธีกรอกข้อมูลทั้งหมด

## 5. Target Users

| ผู้ใช้ | บทบาท | สิ่งที่ต้องทำในระบบ | ความต้องการหลัก |
| --- | --- | --- | --- |
| HR/Admin | ผู้กรอกข้อมูล payroll รายงวด | ตั้งค่างวด กรอกข้อมูลพนักงาน ตรวจยอด และ export | กรอกเร็ว ลดงานซ้ำ |
| Back Office Manager | ผู้ตรวจสอบก่อนส่ง | ตรวจ subtotal, total, net pay และความครบถ้วนของข้อมูลธนาคาร | มองภาพรวมง่าย ตรวจไว |
| สำนักงานบัญชี | ผู้รับไฟล์บัญชี | รับไฟล์ payroll detail ตาม template เดิม | ได้โครงสร้างคงที่ อ่านต่อได้ทันที |
| ฝ่ายการเงิน/ผู้ทำรายการธนาคาร | ผู้รับไฟล์ upload ธนาคาร | นำไฟล์ KBank ไปใช้ต่อในการโอนเงิน | ได้ไฟล์ upload format ถูกต้อง |

## 6. Evidence from Attached Output Files

จากไฟล์สำนักงานบัญชีที่วิเคราะห์ก่อนหน้า พบว่า workbook หนึ่งไฟล์ประกอบด้วยหลายชีตตามบริษัทหรือสาขา แต่ละชีตมีหัวเอกสารของงวดจ่าย จากนั้นแยกข้อมูลออกเป็น **พนักงานประกันสังคม** และ **พนักงานหัก ณ ที่จ่าย** พร้อมคอลัมน์รายรับหลายประเภท คอลัมน์รายการหัก และยอดสุทธิ

จากไฟล์ KBank ใหม่ทั้งสองไฟล์ พบว่าใช้โครงสร้างเดียวกันทั้งหมด กล่าวคือมีเพียงชีตเดียวชื่อ `Transaction Upload` โดยแถวแรกเป็น summary ของจำนวนรายการและจำนวนเงินรวม แถวหัวตารางกำหนดคอลัมน์ `Bank Code`, `Account number`, `Account name`, `Amount` และ `Effective Date` และแถวข้อมูลด้านล่างเป็นรายการจ่ายรายพนักงาน ทั้งไฟล์ `พนง_หักณที่จ่าย` และ `พนง.ประจำ` ต่างกันที่ข้อมูลพนักงานและยอดรวม แต่ **ไม่ได้ต่างกันที่ template**

ข้อสรุปเชิง requirement จึงชัดเจนว่า ระบบควรมี **output engine อย่างน้อย 2 template families** คือ accounting export และ KBank export โดยฝั่ง KBank สามารถใช้ template กลางตัวเดียว แล้ว filter ตาม payroll batch หรือ employee group ได้

## 7. Scope of Version 1

Version 1 ควรโฟกัสเฉพาะสิ่งที่จำเป็นต่อการใช้งานจริงและยังคงเหมาะกับ static hosting โดยสิ่งที่ต้องมีคือการตั้งค่าเอกสารรายงวด การแยกข้อมูลพนักงานตามกลุ่ม payroll การเก็บ field รายรับและรายการหักที่ใช้ในไฟล์บัญชี การเก็บข้อมูลธนาคารของพนักงาน การคำนวณยอดสุทธิอัตโนมัติ การตรวจสอบความครบถ้วนก่อน export และการ export เป็น **.xlsx** ได้อย่างน้อย 2 ปลายทางจากข้อมูลชุดเดียว

สำหรับ v1 ระบบควรออกแบบให้บริษัทหรือสาขาเลือกจาก configuration กลาง และผูกกับกฎ export ที่ต่างกันได้โดยไม่ต้องทำฟอร์มหลายชุด เช่น สาขาหนึ่งอาจใช้เฉพาะ accounting export ขณะที่อีกสาขาใช้ทั้ง accounting และ KBank export ในงวดเดียวกัน

## 8. Out of Scope for Version 1

สิ่งที่ควรตัดออกจาก v1 อย่างชัดเจนเพื่อคุมความซับซ้อน ได้แก่ ระบบ login หลายสิทธิ์, ฐานข้อมูลกลางบน server, workflow อนุมัติหลายชั้น, การเชื่อมเครื่องสแกนนิ้วหรือ time attendance, การส่งไฟล์เข้าธนาคารแบบ API, การคำนวณภาษีแบบเต็มกฎหมายอัตโนมัติ, การออก payslip ให้พนักงาน, การเก็บประวัติ audit แบบองค์กรขนาดใหญ่ และการส่งอีเมลอัตโนมัติไปยังสำนักงานบัญชีหรือธนาคาร

อย่างไรก็ดี **การสร้างไฟล์ KBank upload** ไม่ถือเป็น out of scope แล้ว แต่เป็นความสามารถหลักของ v1 ตาม requirement ใหม่

## 9. Product Strategy: Single Entry, Multi Output

หัวใจของระบบคือการสร้าง **canonical payroll document** หนึ่งฉบับต่อหนึ่งงวด ซึ่งเป็นข้อมูลกลางที่ถูกต้องที่สุดของงวดนั้น เมื่อผู้ใช้กรอกและตรวจสอบเสร็จแล้ว ระบบจะนำข้อมูลกลางนี้ไปสร้าง output ตาม template ที่เลือก

| แนวคิด | ความหมายทางระบบ | ผลลัพธ์ทางธุรกิจ |
| --- | --- | --- |
| Single Entry | ผู้ใช้กรอก payroll และข้อมูลธนาคารพนักงานเพียงครั้งเดียว | ลดงานซ้ำ |
| Shared Calculations | net pay, subtotal, total และ validation ใช้ตรรกะชุดเดียว | ลดยอดไม่ตรงกัน |
| Multi Output | export ได้หลายไฟล์จากเอกสารเดียว | รองรับหลายปลายทาง |
| Template Isolation | logic การจัดรูปแบบถูกแยกตาม template | เพิ่ม template ใหม่ได้ง่าย |

## 10. User Workflow

| ลำดับ | ขั้นตอนผู้ใช้ | ผลลัพธ์ที่คาดหวัง |
| --- | --- | --- |
| 1 | สร้างงวด payroll ใหม่ | ได้เอกสารกลางหนึ่งฉบับสำหรับงวดนั้น |
| 2 | เลือกบริษัท/สาขา และวันที่จ่าย | ระบบตั้ง metadata และข้อกำหนด export ให้ |
| 3 | กรอกข้อมูล payroll ของพนักงาน | ระบบคำนวณ gross, deduction และ net pay อัตโนมัติ |
| 4 | กรอกหรือดึงข้อมูลธนาคารของพนักงาน | ระบบพร้อมสำหรับ KBank export |
| 5 | ตรวจ summary และ validation | ผู้ใช้รู้ทันทีว่างานพร้อม export หรือยัง |
| 6 | เลือก output ที่ต้องการ | เลือก Accounting, KBank หรือทั้งสองแบบ |
| 7 | กด export | ได้ไฟล์ .xlsx ตาม template ที่เลือก |

## 11. Functional Requirements

### 11.1 Document Setup

ระบบต้องให้ผู้ใช้สร้างเอกสาร payroll ใหม่ได้โดยกำหนดอย่างน้อยชื่อบริษัทหรือสาขา วันที่จ่ายเงินเดือน และหากมีการจ่าย service แยกก็ต้องรองรับ field วันที่ที่เกี่ยวข้องเพิ่มเติม Metadata เหล่านี้ต้องถูกใช้ทั้งในไฟล์บัญชีและไฟล์ธนาคารตามกติกาของแต่ละ template

### 11.2 Employee Grouping

ระบบต้องรองรับอย่างน้อย 2 กลุ่มพนักงาน ได้แก่ **พนักงานประกันสังคม** และ **พนักงานหัก ณ ที่จ่าย** เพราะเป็นโครงสร้างหลักของไฟล์บัญชีที่ผู้ใช้ใช้งานจริง นอกจากนี้กลุ่มดังกล่าวต้องสามารถถูกนำไปใช้เป็นตัวกรองตอน export KBank ได้ เช่น export เฉพาะพนักงานประจำ หรือเฉพาะพนักงานหัก ณ ที่จ่ายในแต่ละ batch

### 11.3 Employee Row Management

ผู้ใช้ต้องสามารถเพิ่ม แก้ไข ลบ และเรียงลำดับแถวพนักงานได้ โดยแต่ละแถวควรมีข้อมูลพื้นฐานขั้นต่ำคือ ลำดับ ชื่อพนักงาน ประเภทพนักงาน และชุดตัวเลข payroll ที่เกี่ยวข้อง ทั้งนี้ระบบต้องรองรับการกรอกผ่าน keyboard อย่างรวดเร็วเพื่อให้เหมาะกับงานจำนวนแถวมาก

### 11.4 Earnings Input

ระบบต้องรองรับ field รายรับหลักที่พบในไฟล์จริง เช่น Salary Base, OT Base, ค่าตำแหน่ง, ค่าภาษา, ค่าอาหาร, ค่าเดินทาง, Service, Incentive, เบี้ยขยัน และ OT พร้อมรองรับแนวคิด configurable columns ระดับ template หรือระดับบริษัท เพื่อให้หน้าจอเดียวสามารถครอบคลุมหลายสาขาได้

### 11.5 Deduction Input

ระบบต้องรองรับ field รายการหักที่พบจริง ได้แก่ ปกส., กยศ., ภงด.1, หักกู้ยืม, No work No pay และหัก ณ ที่จ่าย โดยระบบควรแยกกฎการแสดงผลและการคำนวณตาม employee group เพื่อป้องกันการกรอกผิดประเภท

### 11.6 Bank Account Input

เพื่อรองรับ KBank export ระบบต้องมีข้อมูลธนาคารระดับพนักงานอย่างน้อย 4 field ได้แก่ **bank_code**, **bank_account_number**, **bank_account_name** และ **effective_payment_date** ข้อมูลชุดนี้เป็น requirement ใหม่ที่ไม่มีอยู่ในไฟล์บัญชี แต่จำเป็นต่อไฟล์ KBank ดังนั้นใน UX ควรแยกเป็น bank info block ที่ชัดเจน และเปิด validation เฉพาะเมื่อผู้ใช้ต้องการ export ไป KBank

### 11.7 Auto Calculation

ระบบต้องคำนวณอัตโนมัติอย่างน้อย 5 ค่า คือเงินเดือนหรือค่าจ้างรวม, รวมรายรับพิเศษ, รวมรายรับ, รวมรายการหัก และรวมสุทธิ โดย **ยอดสุทธิ** จะเป็นค่าหลักที่ถูกส่งต่อไปยัง KBank export ในคอลัมน์ `Amount` เว้นแต่มี business rule เฉพาะที่ระบุว่าบาง batch ต้องใช้ยอดอีกประเภทหนึ่ง

### 11.8 Validation

ระบบต้องตรวจสอบความถูกต้องก่อน export แยกตาม output type ดังนี้ ฝั่ง accounting ต้องตรวจ field payroll ที่จำเป็นต่อการจัดทำรายงานบัญชี ส่วนฝั่ง KBank ต้องตรวจข้อมูลธนาคาร, ชื่อบัญชี, เลขบัญชี, effective date และจำนวนเงินที่ต้องเป็นค่ามากกว่าศูนย์ หากผู้ใช้เลือก export หลาย output พร้อมกัน ระบบต้องแสดง validation แบบแยกหมวด เพื่อให้รู้ทันทีว่า output ไหนพร้อมหรือยังไม่พร้อม

### 11.9 Output Selection

ระบบต้องมีตัวเลือก export อย่างชัดเจนอย่างน้อย 3 แบบ ได้แก่ **Export Accounting**, **Export KBank**, และ **Export All** โดย `Export All` ต้องสร้างไฟล์ทั้งสองแบบจาก snapshot เดียวกันของข้อมูลปัจจุบัน เพื่อป้องกันปัญหาการแก้ข้อมูลระหว่างสร้างไฟล์คนละรอบ

### 11.10 Accounting Export

ระบบต้อง export ออกเป็น **.xlsx** ตามโครงสร้างไฟล์สำนักงานบัญชีเดิมให้ใกล้เคียงที่สุด ทั้งในแง่ชื่อชีต ลำดับ section ลำดับคอลัมน์ subtotal total และตำแหน่งหัวเอกสาร เพื่อให้ปลายทางเปิดใช้งานต่อได้โดยแทบไม่ต้องแก้ไขด้วยมือ

### 11.11 KBank Export

ระบบต้อง export ออกเป็น **.xlsx** ตามโครงสร้าง `Transaction Upload` โดยมี summary ด้านบนและรายการจ่ายต่อพนักงานด้านล่างอย่างน้อยตามคอลัมน์ที่พบจริงในไฟล์ตัวอย่าง ได้แก่ Bank Code, Account Number, Account Name, Amount และ Effective Date ทั้งนี้ระบบควรสามารถสร้าง KBank file แยกตามกลุ่ม payroll หรือ batch ได้ หากผู้ใช้ต้องการแยกไฟล์สำหรับพนักงานประจำกับพนักงานหัก ณ ที่จ่าย

## 12. Data Model

| Entity | Field สำคัญ | คำอธิบาย |
| --- | --- | --- |
| PayrollDocument | company_name, branch_name, payroll_date, service_date, sheet_name, export_targets | เอกสารกลางของ payroll หนึ่งงวด |
| EmployeeRow | employee_id, group_type, sequence, full_name, remark, active_for_export | ข้อมูลพนักงานหนึ่งแถว |
| Earnings | salary_base, ot_base, position_allowance, language_allowance, meal_allowance, transport_allowance, service, incentive, diligence_bonus, ot | กลุ่มรายรับ |
| Deductions | social_security, student_loan, personal_income_tax, loan_deduction, no_work_no_pay, withholding_tax, other_deduction | กลุ่มรายการหัก |
| BankInfo | bank_code, bank_account_number, bank_account_name, effective_payment_date | ข้อมูลที่ใช้สร้างไฟล์ KBank |
| CalculatedTotals | gross_salary, extra_income_total, gross_income, total_deduction, net_pay | ค่าที่ระบบคำนวณอัตโนมัติ |
| ExportProfile | profile_name, output_type, employee_filter, file_name_rule | กติกา export สำหรับแต่ละปลายทาง |

## 13. Information Architecture and Screen Structure

สำหรับ v1 ยังควรใช้โครงสร้างหน้าเดียวเป็นหลัก เพราะเหมาะกับเป้าหมาย simple minimal แต่ต้องเพิ่มแนวคิด **output-aware layout** คือให้ผู้ใช้เห็นตั้งแต่ต้นว่าข้อมูลส่วนใดใช้กับทุก output และข้อมูลส่วนใดใช้เฉพาะ KBank

| ส่วนของหน้าจอ | หน้าที่ | หมายเหตุ |
| --- | --- | --- |
| Header | ชื่อเอกสาร งวดจ่าย ปุ่ม Save Draft และ Export | เน้น action หลักให้ชัด |
| Document Setup | บริษัท/สาขา วันที่จ่าย วันที่ Service และ export targets | กำหนดบริบทงวด |
| Section A | พนักงานประกันสังคม | มีตารางกรอก payroll detail |
| Section B | พนักงานหัก ณ ที่จ่าย | ใช้กฎ payroll ตามกลุ่ม |
| Bank Info Panel | ข้อมูลธนาคารรายพนักงาน หรือ field ที่เกี่ยวข้อง | ใช้สำหรับ KBank export |
| Summary Panel | subtotal, total, transaction count, validation status | sticky เพื่อช่วยตรวจงาน |
| Export Drawer | เลือก template ปลายทางและชื่อไฟล์ | ทำก่อนดาวน์โหลดจริง |

## 14. UX Requirements

UX ต้องถูกออกแบบให้เป็นเครื่องมือทำงาน ไม่ใช่ dashboard ทั่วไป ดังนั้นผู้ใช้ควรเห็นทันทีว่า field ไหนเป็น **ข้อมูลกลาง**, field ไหนเป็น **ข้อมูลสำหรับ KBank เท่านั้น**, และ output ไหนยังติด validation อยู่ การใช้สีและองค์ประกอบควรสงบ แต่ต้องแยกสถานะพร้อมใช้งานกับยังไม่พร้อมได้อย่างชัดเจน

นอกจากนี้ควรรองรับแนวทางทำงานจริงของทีม HR เช่น การ copy/paste หลายแถว, การ tab ต่อเนื่อง, การ duplicate employee row, การ sticky subtotal ระหว่างเลื่อน และการ preview ยอดรวม transaction count สำหรับ KBank ก่อน export เพราะไฟล์ธนาคารเน้นความครบถ้วนของรายการและยอดรวมมากเป็นพิเศษ

## 15. Export Rules

| ส่วน export | Accounting Template | KBank Template |
| --- | --- | --- |
| Workbook shape | หลายชีตตามบริษัท/สาขา | ชีตเดียว `Transaction Upload` |
| Row structure | มีหัวเอกสาร แบ่ง 2 section payroll | มี summary ด้านบนและรายการโอนด้านล่าง |
| Required fields | ข้อมูล payroll detail ครบถ้วน | bank code, account no, account name, amount, effective date |
| Amount source | อิงจาก payroll calculations ตาม template บัญชี | ใช้ `net_pay` หรือยอดจ่ายสุทธิที่กำหนด |
| Employee scope | ทั้งเอกสารหรือทั้งสาขา | เลือกได้ตาม batch หรือ employee group |
| Date format | ตามกติกาไฟล์บัญชีเดิม | `DD/MM/YYYY` ตามตัวอย่างไฟล์ |
| Totals | subtotal และ total ตาม section | total transaction count และ total amount |

## 16. Non-Functional Requirements

| หัวข้อ | Requirement |
| --- | --- |
| Performance | เอกสารหนึ่งงวดต้องใช้งานได้ลื่นแม้มีหลายสิบถึงหลักร้อยแถว |
| Reliability | ค่าคำนวณและไฟล์ export ต้อง deterministic จาก input ชุดเดียวกัน |
| Simplicity | ผู้ใช้ใหม่ควรเรียนรู้ flow หลักได้ภายในครั้งแรก |
| Maintainability | โค้ดต้องแยก canonical data model ออกจาก template render logic |
| Portability | ระบบต้อง build เป็น static files ได้ และไม่พึ่ง backend สำหรับ v1 |
| Auditability | ผู้ใช้ต้องตรวจยอดรวมก่อน export ได้ชัดเจน |

## 17. Recommended Technical Approach

สถาปัตยกรรมที่เหมาะที่สุดสำหรับ v1 ยังเป็น **static frontend application** ที่ประมวลผลทุกอย่างใน browser โดยเก็บ draft ใน local storage หรือผ่าน file import/export ภายในเครื่อง แล้วสร้างไฟล์ Excel ฝั่ง client ตอนกด export วิธีนี้ยังตรงกับ requirement เรื่องโครงสร้างง่าย ดูแลง่าย และเหมาะกับ GitHub Pages หรือ Cloudflare Pages โดยไม่ต้องมี backend ในระยะแรก

ในเชิง implementation ควรแยกโครงสร้างโค้ดเป็น 3 ชั้นอย่างชัดเจน ชั้นแรกคือ **canonical payroll model** สำหรับข้อมูลกลาง ชั้นที่สองคือ **calculation and validation engine** สำหรับคำนวณยอดและเช็กความพร้อม และชั้นที่สามคือ **template exporters** ที่รับข้อมูลกลางเดียวกันไปสร้างไฟล์ accounting หรือ KBank วิธีนี้เป็นโครงสร้างที่ง่ายที่สุดที่ยังขยายต่อได้ดี

## 18. Hosting Recommendation

สำหรับโจทย์นี้ ตัวเลือกที่เหมาะที่สุดเรียงตามความเป็นไปได้มีดังนี้

| ลำดับ | ตัวเลือก | เหตุผล |
| --- | --- | --- |
| 1 | Cloudflare Pages | เหมาะที่สุดสำหรับ static web app เพราะรองรับการ deploy เว็บไซต์ static HTML ได้โดยตรง และเชื่อมกับ Git repository ได้ง่าย [2] |
| 2 | GitHub Pages | เหมาะหากต้องการ workflow ตรงกับ GitHub และเป็น static site โดยตรงจากไฟล์ HTML, CSS และ JavaScript ใน repository [1] |
| 3 | GitHub Pages + Cloudflare custom domain | ใช้ได้หากต้องการคุม repo บน GitHub แต่จัดการ DNS และ custom domain ผ่าน Cloudflare ภายหลัง [1] [3] |

ในเชิง practical หากทีมต้องการความยืดหยุ่นเรื่อง preview deployment และการคุมโดเมน ผมยังแนะนำ **Cloudflare Pages** เป็นตัวเลือกหลัก แต่ถ้าต้องการ workflow ที่ตรงกับ GitHub แบบเรียบที่สุด GitHub Pages ก็ยังเหมาะอยู่

## 19. Success Metrics

| Metric | เป้าหมาย v1 |
| --- | --- |
| เวลาเฉลี่ยในการทำ payroll export 1 งวด | ลดลงจากวิธีเดิมอย่างมีนัยสำคัญ |
| จำนวนการกรอกข้อมูลซ้ำ | ลดลงใกล้ศูนย์ เพราะใช้ single-entry workflow |
| จำนวนกรณียอดบัญชีกับยอดธนาคารไม่ตรงกัน | ลดลงอย่างชัดเจน |
| อัตรา export ผ่านในรอบแรก | สูงขึ้นทั้งฝั่งบัญชีและ KBank |
| ระยะเวลาสอนงานคนใหม่ | สั้นลง เพราะ flow ชัดและมี validation |

## 20. Acceptance Criteria for Version 1

ระบบจะถือว่าพร้อมใช้งานเมื่อผู้ใช้สามารถสร้าง payroll document ใหม่ เลือกบริษัทหรือสาขา กรอกข้อมูลพนักงานทั้งสองกลุ่ม กรอกข้อมูลธนาคารที่จำเป็น เห็นยอดคำนวณอัตโนมัติ ตรวจพบข้อผิดพลาดก่อน export และดาวน์โหลดไฟล์ Excel ได้อย่างน้อย 2 แบบจากข้อมูลชุดเดียว ได้แก่ไฟล์สำนักงานบัญชีและไฟล์ KBank โดยยอดรวมและจำนวนรายการของแต่ละ output ต้องสอดคล้องกับข้อมูลล่าสุดในเอกสารเดียวกัน

## 21. Risks and Constraints

ความเสี่ยงหลักของระบบนี้มี 3 เรื่อง เรื่องแรกคือ **ความต่างของ template ตามสาขาหรือแบรนด์** ซึ่งอาจทำให้ field บางคอลัมน์ไม่เหมือนกัน เรื่องที่สองคือ **คุณภาพข้อมูลธนาคารของพนักงาน** เพราะหากเลขบัญชีหรือชื่อบัญชีไม่ครบ จะกระทบ KBank export ทันที และเรื่องที่สามคือ **นิยามของยอดที่ส่งธนาคาร** ซึ่งต้องยืนยันให้ชัดว่าคือ `net_pay` เสมอ หรือมีบางกรณีต้องหัก/แยกบางรายการก่อน

อีกข้อจำกัดสำคัญคือหากใช้ static-only architecture ข้อมูล draft จะอยู่ฝั่ง browser เป็นหลัก จึงเหมาะกับทีมเล็กหรือใช้บนเครื่องงานประจำ แต่ยังไม่เหมาะกับกรณีที่ต้องแชร์งานข้ามคนแบบ real-time หรือเก็บประวัติส่วนกลางระยะยาว

## 22. Recommended Phase Plan

| Phase | เป้าหมาย | รายละเอียด |
| --- | --- | --- |
| Phase 1 | Build MVP single-entry app | กรอก payroll, คำนวณ, เก็บ bank info, export accounting และ KBank |
| Phase 2 | Add template configuration | รองรับความต่างของหลายบริษัท/สาขาและ naming rules |
| Phase 3 | Add shared persistence | หากต้องใช้หลายคนหรือหลายเครื่อง ค่อยเพิ่ม backend |
| Phase 4 | Add approval and audit trail | หากมีขั้นตอนตรวจหลายชั้น ค่อยเพิ่ม workflow |

## 23. Open Questions Before Development

ก่อนเริ่มพัฒนา ควรยืนยันคำถามต่อไปนี้เพื่อให้รอบแรกตรงที่สุด

| คำถาม | เหตุผล |
| --- | --- |
| 1. ไฟล์ KBank ต้องแยกตามพนักงานประจำกับพนักงานหัก ณ ที่จ่ายเสมอหรือไม่ | มีผลต่อ export profile และชื่อไฟล์ |
| 2. จำนวนเงินที่ส่ง KBank ใช้ `net_pay` 100% หรือมีข้อยกเว้นบางสาขา | มีผลต่อ calculation rule |
| 3. ข้อมูล bank account จะกรอกทุกงวด หรือเก็บเป็น master employee profile | มีผลต่อ UX และ persistence |
| 4. สำนักงานบัญชีต้องการ format เดิม 100% รวม style และ merge cell หรือแค่โครงสร้างข้อมูลตรง | มีผลต่อ effort ฝั่ง Excel export |
| 5. หนึ่งงวดจะ export เป็นไฟล์บัญชีเดียวหลายชีต และ KBank หลายไฟล์แยก batch หรือไม่ | มีผลต่อ export flow |
| 6. มีพนักงานที่ไม่ได้รับโอนผ่าน KBank หรือไม่ | มีผลต่อ validation และ employee filtering |

## 24. Final Recommendation

ข้อเสนอที่ดีที่สุดสำหรับโจทย์นี้คือเริ่มจาก **MVP แบบ static web app ที่เป็น single-entry multi-export tool** กล่าวคือให้ HR กรอกข้อมูล payroll ครั้งเดียว ระบบคำนวณยอดสุทธิและตรวจความครบถ้วน จากนั้นเลือก export เป็นไฟล์สำนักงานบัญชี, ไฟล์ KBank หรือทั้งสองแบบพร้อมกัน แนวทางนี้แก้ปัญหาที่สำคัญที่สุดได้ตรงจุด คือ **ลดงานซ้ำและทำให้ยอดของทุกปลายทางยึดจากข้อมูลกลางเดียวกัน**

หากต้องเลือกหลักการออกแบบเพียงข้อเดียว ผมแนะนำให้ยึดประโยคนี้เป็นแกนของการพัฒนา:

> **One payroll entry, multiple trusted outputs.**

หลักการนี้สอดคล้องกับไฟล์จริงที่คุณให้มา และเป็นทางเลือกที่เรียบที่สุดแต่มีประสิทธิภาพที่สุดสำหรับ v1

## References

[1]: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages "What is GitHub Pages? - GitHub Docs"
[2]: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/ "Static HTML · Cloudflare Pages docs"
[3]: https://pages.github.com/ "GitHub Pages"
