# מבנה טבלת lessons

## עמודות הטבלה:

| Column Name | Data Type | Nullable | Default | Constraint |
|-------------|-----------|----------|---------|------------|
| id | uuid | NO | gen_random_uuid() | PRIMARY KEY |
| unit_id | uuid | NO | null | FOREIGN KEY |
| title | text | NO | null | - |
| order | integer | NO | null | - |
| created_at | timestamp with time zone | YES | now() | - |
| duration | text | YES | null | - |
| locked | boolean | YES | null | - |
| embedUrl | text | YES | null | - |
| notes | text | YES | null | - |
| description | text | YES | null | - |
| is_lab | boolean | NO | false | - |

## הערות חשובות:
- השדה `embedUrl` מכיל את URL הוידאו (לא `embed_url`)
- השדה `duration` הוא טקסט בפורמט "MM:SS" (לא `duration_seconds`)
- השדה `id` הוא UUID (לא integer)
- השדה `order` הוא integer (לא `order_index`)