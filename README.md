# CareManager / 医療・福祉・介護 詳細管理アプリ
##### 医療、福祉、介護現場での日々の記録をデジタル化し、利用者の健康リスクやケアの傾向を分析するためのプロトタイプアプリケーションです。
##### This is a prototype application designed to digitize daily records in medical, welfare, and nursing care settings to analyze user health risks and care trends.
## 主な機能 / Key Features
1. 記録入力 (Data Input)

- 出欠管理: 出席、欠席、遅刻、早退のステータス記録。
- イベント記録: 通院・受診、定期検査、行政手続の有無をチェック。
- 服薬管理: 朝・昼・夕・眠前など、タイミング別の服薬実施記録。
- 特記事項: 自由記述による詳細な様子の記録。
- Attendance Management: Record status such as Present, Absent, Late, or Early Departure.
- Event Tracking: Checkboxes for hospital visits, medical checkups, and administrative procedures.
- Medication Management: Record medication administration by timing (Morning, Lunch, Dinner, etc.).
- Notes: Detailed record of user conditions through free-text input.

2. 履歴表示 (History List)

- 過去の記録をカード形式で一覧表示。
- 不要な記録の削除機能。
- 日付やステータスによる視認性の高いUI。
- View past records in a card-style list.
- Functionality to delete unnecessary records.
- High-visibility UI sorted by date and status.

## 修正履歴 / Fix Notes

- v1.1: コンパイルエラー（ファイル参照エラー）を回避するため、すべてのコンポーネントを App.jsx に統合。
- v1.1: Fixed compilation errors by consolidating all components into App.jsx to ensure compatibility with the preview environment.
