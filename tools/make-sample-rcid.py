#!/usr/bin/env python3
"""
生成 RCID 的「已填报」样本，用于验证解析器与派生算法。

原始那份是空白模板，无法端到端证伪；这份按设计好的数值填一遍，
期望结果可以手算出来，再与解析器输出对账。

用法：python3 tools/make-sample-rcid.py <原文件> <输出文件>
"""
import sys
import shutil
import datetime as dt

import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else 'RCID DART - Data Inputs.xlsx'
DST = sys.argv[2] if len(sys.argv) > 2 else 'RCID DART - Data Inputs 2025-04 sample.xlsx'

shutil.copy(SRC, DST)
wb = openpyxl.load_workbook(DST)
ws = wb['DE152 2.0']

D = dt.datetime


def put(addr, v):
    ws[addr] = v


def kv_col(col, start, values):
    """按 (行号, 值) 列表写入某一列"""
    for row, v in values:
        ws[f'{col}{row}'] = v


# ---------- §1 主合同（B 列） ----------
kv_col('B', 3, [
    (3, 'DE152'),
    (4, 'Professional Services'),
    (5, 'Civil'),
    (6, 'Enhancement of Xilin Ave, ECP and Tanah Merah Coast Road'),
    (7, 'CES-SDC-KTC JV'),
    (8, 'S$757 million'),
    (9, D(2024, 6, 1)),
    (10, D(2028, 5, 31)),
    (11, '+62 days'),
    (12, 'PL 1'),
    (13, 'PO 2'),
    (14, 'Members 12'),
    (15, 'Good'),
    (16, 'CONSTRUCTION'),
])

# ---------- §2 QPS 支撑合同 ----------
kv_col('B', 18, [
    (18, 'DE152-QPS-01'),
    (19, 'Professional Services'),
    (20, 'Civil'),
    (21, 'QP(S) Appointment for DE152'),
    (22, 'TTPG Pte Ltd'),
    (23, 'S$ 2.8M'),
    (24, D(2024, 6, 1)),
    (25, D(2028, 5, 31)),
    (26, 'J. Tan'),
    (27, 'A. Wong'),
    (28, 'Excellent'),
    (29, 3),
])

# ---------- §2.1 QSS 团队（A/B/C/E/F 列，D 列空） ----------
# 注意：本节只有 4 个数据行（32-35），第 36 行是下一节的标题（A36:F36 合并）
qss = [
    ('Ir. W. Xu', 'QPS (Civil)', 'QPS/C/2019-042', 'Good', 'Full-time on site. Monthly QA reports submitted on time.'),
    ('Mr. K. Chan', 'QPS (Geotechnical)', 'QPS/G/2020-017', 'Satisfactory', 'Covers FB2 & FB3 instrumentation reviews.'),
    ('Ir. L. Teo', 'Resident Engineer', 'RE/2018-115', 'Excellent', 'Leads weekly site coordination.'),
    ('Mr. D. Ng', 'Resident Technical Officer', 'RTO/2021-063', 'Good', 'Supervises Tunnel East excavation & struts.'),
]
for i, (name, desig, reg, rating, remarks) in enumerate(qss):
    r = 32 + i
    ws[f'A{r}'] = name
    ws[f'B{r}'] = desig
    ws[f'C{r}'] = reg
    ws[f'E{r}'] = rating
    ws[f'F{r}'] = remarks

# ---------- §3 认证检查师 ----------
kv_col('B', 37, [
    (37, 'DE152-AC-01'),
    (38, 'Safety & Supervision'),
    (39, 'Civil'),
    (40, 'Authorized Clerk of Works'),
    (41, 'AC Consultant Pte Ltd'),
    (42, 'Dr. L. Ng'),
    (43, 'S$ 1.2M'),
    (44, D(2024, 6, 1)),
    (45, D(2028, 5, 31)),
    (46, 'K. Lim'),
    (47, 'D. Ng'),
    (48, 'Good'),
    (49, 'Good'),
])

# ---------- §4 注册检查员 ----------
kv_col('B', 51, [
    (51, 'DE152-RI-01'),
    (52, 'Inspection & Testing'),
    (53, 'Geotechnical'),
    (54, 'RI Appointment for Structural Works'),
    (55, 'MEP Consultants Pte Ltd'),
    (56, 'S$ 0.9M'),
    (57, 'Dr. A. Lim'),
    (58, 'Mr. B. Tan'),
    (59, 'Ms. C. Ng'),
    (60, D(2024, 6, 1)),
    (61, D(2028, 5, 31)),
    (62, 'S. Chen'),
    (63, 'H. Tan'),
    (64, 'Satisfactory'),
    (65, 'Good'),
    (66, 'Satisfactory'),
    (67, 'Good'),
])

# ---------- §5 独立审查员 ----------
kv_col('B', 69, [
    (69, 'DE152-IR-01'),
    (70, 'Lab Testing'),
    (71, 'Materials'),
    (72, 'IR for Concrete & Steel Testing'),
    (73, 'TestLab Pte Ltd'),
    (74, 'S$ 0.6M'),
    (75, 'Prof. D. Ho'),
    (76, D(2024, 6, 1)),
    (77, D(2028, 5, 31)),
    (78, 'R. Zhou'),
    (79, 'J. Lee'),
    (80, 'Good'),
])

# ---------- §6 监测 ----------
kv_col('B', 82, [
    (82, 'DE152-INS-01'),
    (83, 'Instrumentation'),
    (84, 'Geotechnical'),
    (85, 'Instrumentation & Monitoring Services'),
    (86, 'GeoMon Pte Ltd'),
    (87, 'Dr. E. Wong'),
    (88, 'S$ 0.5M'),
    (89, D(2024, 7, 1)),
    (90, D(2028, 5, 31)),
    (91, 'M. Zhao'),
    (92, 'C. Goh'),
    (93, 'Satisfactory'),
    (94, 'Satisfactory'),
])

# ---------- §7 工程范围 / §8 关键进展（整段写在 A 列） ----------
ws['A96'] = ('1. One flyover across ECP from Xilin Ave to TMCR/T5\n'
             '2. One vehicular underpass at Tanah Merah Coast Road\n'
             '3. Widening of CADC between Laguna Golf Green and Changi Coast Walk')

ws['A98'] = ('1. Tunnel T2 roof slab cast\n'
             '2. Xilin Flyover Span 5 PSC beam launching completed\n'
             '3. CADC east bank cofferdam closed\n'
             '4. ECP night traffic staging Phase 3 completed\n'
             '5. B2 bridge piles completed (48 nos.)')

# ---------- §9 关注事项（A/B/C 列） ----------
concerns = [
    ('FB3 traffic staging conflicts with live ECP lanes', 'Major', 'Phased staging with LTA TMC; added night work windows'),
    ('PowerGrid diversion approval lag affects Flyover pier', 'Moderate', 'Escalated to SO; approval expected Jun'),
    ('Monsoon slows CADC spoil removal', 'Minor', 'Additional trucks; re-sequenced works'),
]
for i, (t, cat, mit) in enumerate(concerns):
    r = 100 + i
    ws[f'A{r}'] = t
    ws[f'B{r}'] = cat
    ws[f'C{r}'] = mit

# ---------- §12 施工进度（模板只有 2 个数据行） ----------
# 列：A=Location B=Progress C=Elements D=Quantity E=ActualCompletion
#     F=Percentage G=X H=Y I=Risk of Delay J=Reasons K=Remarks
# X/Y 留空 —— 坐标由解析器按 Location 去既有坐标表里取
zones = [
    ('FB2', 'Roof slab cast', 'Tunnel box / pump room', '1 lot', '2025-04-15', 38, 'On Track', 'No Issues', 'Manpower shortage'),
    ('Xilin_Flyover', 'Span 5 launching', 'Pier & PSC beam', '12 nos.', '2025-04-20', 62, 'High Risk', 'Service Diversions', 'Utility diversion approval lag'),
]
for i, (loc, prog, el, qty, act, pct, risk, reason, remark) in enumerate(zones):
    r = 119 + i
    for col, v in zip('ABCDEFIJK', [loc, prog, el, qty, act, pct, risk, reason, remark]):
        ws[f'{col}{r}'] = v

# ---------- §13.1 WSO 内部（3 行） ----------
# B=WSO Status C=WSO Amount D=Progress Payment E=Start F=End
wso_in = [
    ('WSO-001', 'Approved', 1500000, 1200000, D(2025, 1, 15), D(2025, 3, 15)),
    ('WSO-002', 'In Progress', 800000, 400000, D(2025, 2, 1), D(2025, 4, 30)),
    ('WSO-003', 'Closed', 300000, 300000, D(2024, 11, 1), D(2024, 12, 31)),
]
for i, row in enumerate(wso_in):
    r = 123 + i
    for col, v in zip('ABCDEF', row):
        ws[f'{col}{r}'] = v

# ---------- §13.2 WSO 外部 ----------
ws['A127'] = 'WSO-EXT-001'
ws['B127'] = 'In Progress'
ws['C127'] = 500000
ws['D127'] = 250000
ws['E127'] = D(2025, 3, 1)
ws['F127'] = D(2025, 5, 31)

# ---------- §13.3 进度款（B=Amount D=Total Cumulative F=Total Contract Sum） ----------
claims = [
    (131, 28000000, 28000000),
    (132, 35000000, 63000000),
    (133, 46000000, 109000000),
    (134, 52000000, 161000000),
]
for r, amt, cum in claims:
    ws[f'B{r}'] = amt
    ws[f'D{r}'] = cum
ws['F131'] = 757000000

# ---------- §13.4 RFV ----------
rfv = [
    ('Additional benches for bus interchange', 150000, 50000, 150000, 'In Progress'),
    ('Extra drainage along CADC', 80000, 0, 230000, 'Closed'),
]
for i, row in enumerate(rfv):
    r = 141 + i
    for col, v in zip('ABCDE', row):
        ws[f'{col}{r}'] = v

# ---------- §13.5 通知索赔 ----------
ws['A145'] = 'NC 001 - Notification of Delay in BCA Building Plan Approval'
ws['B145'] = 120000
ws['C145'] = 30
ws['D145'] = D(2025, 3, 10)
ws['E145'] = 'Pending SO Decision'

# ---------- §13.6 EOT（3 行，EOT 天数用来验证 max=95） ----------
# 首列必须一并覆盖：模板里 A149 是「eg. W58 - Yishun Avenue 3」，
# 只填 B..E 的话该行会被示例行过滤规则丢掉
eot = [
    ('W58 - Yishun Avenue 3', D(2024, 1, 8), D(2024, 4, 12), 95, 'Closed'),
    ('W61 - Tampines Ave 10', D(2024, 5, 1), D(2024, 6, 15), 45, 'Closed'),
    ('W79 - Xilin Ave', D(2025, 1, 10), D(2025, 3, 20), 69, 'In Progress'),
]
for i, row in enumerate(eot):
    r = 149 + i
    for col, v in zip('ABCDE', row):
        ws[f'{col}{r}'] = v

# ---------- §13.7 NCN 明细 ----------
ncn = [
    ('Improper concrete mix ratio used in column casting', 'Closed', D(2025, 1, 20), D(2025, 2, 5), 'QPS', 'Rectified'),
    ('Waterproofing membrane not lapped per spec', 'Open', D(2025, 4, 8), None, 'RE', ''),
]
for i, row in enumerate(ncn):
    r = 153 + i
    for col, v in zip('ABCDEF', row):
        if v is not None:
            ws[f'{col}{r}'] = v

# ---------- §14.1 公用设施损坏（A C D E F） ----------
ws['A171'] = 'On 17 March, contractor conducted a trial trench to locate a 75mm gas pipe which is not shown on the service plan.'
ws['C171'] = D(2025, 3, 21)
ws['D171'] = 3.75
ws['E171'] = 'SPPG'
ws['F171'] = 5000

# ---------- §14.2 非 MOM 可报告事故（A D E） ----------
ws['A175'] = 'On 15 April, JL cables Detection damaged 3 of 10 Starhub pipes during hacking works.'
ws['D175'] = D(2025, 4, 15)
ws['E175'] = 'Cable damage'

# ---------- §14.3 MOM 可报告事故 >3 天（A D E） ----------
ws['A179'] = 'On 23 December, IP sustained finger injury while securing load with a lever chain ratchet. 15 days MC.'
ws['D179'] = D(2024, 12, 23)
ws['E179'] = 15

# ---------- §14.4 MOM 可报告事故 <3 天（A D E，2 行） ----------
ws['A183'] = 'On 10 January, a worker tripped over uneven ground and sustained a minor cut. 3 days MC.'
ws['D183'] = D(2025, 1, 10)
ws['E183'] = 3

ws['A184'] = 'On 20 April, a worker sustained a minor hand abrasion during rebar tying. 2 days MC.'
ws['D184'] = D(2025, 4, 20)
ws['E184'] = 2

# ---------- §14.5 环境违规（A E F） ----------
ws['A187'] = 'NEA site visit found mosquito larvae in a broken water-filled barrier at Tampines North work zone.'
ws['E187'] = 'NEA'
ws['F187'] = D(2025, 4, 10)

# ---------- §14.6 近失（A B C D E F） ----------
ws['A191'] = 'Reported by SAE Kamarudin - GI pipes coupler was not covered, posing laceration risk.'
ws['B191'] = 'New cover secured onto the coupler'
ws['C191'] = 'Bishan Road, near LP80'
ws['D191'] = 'Cycling Path Network'
ws['E191'] = 'Laceration'
ws['F191'] = 'Inadequate guarding / protection'

# ---------- §14.7 媒介控制（A B C D E F） ----------
ws['A195'] = 'Tuas Road, near LP80'
ws['B195'] = D(2025, 4, 10)
ws['C195'] = 'Yes'
ws['D195'] = 'Area treated and fined'
ws['E195'] = 2000
ws['F195'] = 'Vector Control'

# ---------- §16 总体进度（A=Month B=Early C=Late D=Actual E=EarlyVar F=LateVar） ----------
# Early/Late 沿用改造前基线里的数值，便于直接对照 Planned = (E+L)/2
progress = [
    (2025, 1, 5, 2, 3, 2),
    (2025, 2, 18, 9, 12, 4),
    (2025, 3, 38, 20, 27, 6),
    (2025, 4, 58, 39, 43, 8),
    (2025, 5, 68, 52, None, 9),
    (2025, 6, 77, 63, None, 10),
    (2025, 7, 84, 72, None, 11),
    (2025, 8, 90, 80, None, 12),
    (2025, 9, 94, 87, None, 13),
    (2025, 10, 97, 92, None, 14),
    (2025, 11, 99, 96, None, 15),
    (2025, 12, 100, 100, None, 16),
]
for i, (y, m, early, late, actual, evar) in enumerate(progress):
    r = 237 + i
    ws[f'A{r}'] = D(y, m, 1)
    ws[f'B{r}'] = early
    ws[f'C{r}'] = late
    if actual is not None:
        ws[f'D{r}'] = actual
    ws[f'E{r}'] = evar

wb.save(DST)
print(f'已生成 {DST}')
