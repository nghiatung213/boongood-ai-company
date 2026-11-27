# Boongood 3D Virtual Office — Friends Lore Data Schema (0-Token Frontend)

Thư mục `frontend/src/data/lore/` chứa toàn bộ kho kịch bản tương tác chạy **0-token hoàn toàn phía Frontend (Three.js)**, được chuyển hóa trực tiếp từ [docs/friends_deep_lore.md](../../../../docs/friends_deep_lore.md) và tùy biến cho văn phòng **BoonGood** của **sếp Bông**.

---

## 1. Hằng số chuẩn dùng chung (Enums)

### Mã nhân vật (`character_id`)
`"rachel" | "monica" | "chandler" | "ross" | "joey" | "phoebe"`

### 12 sắc thái khuôn mặt (`face_expression`)
`"neutral" | "happy" | "laugh" | "smirk_sarcastic" | "flirty" | "shock" | "panic" | "angry" | "obsessive_intense" | "dreamy_sing" | "facepalm_tired" | "hearts"`

### 10 động tác cơ thể (`body_gesture`)
`"idle_talk" | "point" | "shrug" | "excited_bounce" | "lean_in" | "wave" | "head_shake" | "hands_up_panic" | "sip_coffee" | "play_guitar"`

### 12 vị trí đạo cụ & bàn làm việc (`zone_id`)
- **6 khu vực chung:** `purple_door`, `orange_sofa`, `foosball_table`, `coffee_counter`, `chick_duck_corner`, `monica_secret_closet`
- **6 bàn làm việc riêng:** `desk_rachel`, `desk_monica`, `desk_chandler`, `desk_ross`, `desk_joey`, `desk_phoebe`

### Cấu trúc câu thoại chuẩn (`DialogueLine`)
Mọi câu thoại trong cả 5 file JSON đều bắt buộc có đủ các trường diễn xuất sau để điều khiển blendshape/biểu cảm mặt và animation cơ thể 3D:

```json
{
  "character_id": "chandler",
  "text": "Could this margin BE any better?",
  "face_expression": "smirk_sarcastic",
  "body_gesture": "point",
  "delay_ms": 0
}
```
*(Trường `delay_ms` là tùy chọn — ví dụ `3000` ms cho phản ứng chậm đặc trưng của Joey.)*

---

## 2. Cấu trúc chi tiết 5 file dữ liệu JSON

| File | Số lượng | Cấu trúc chính |
| :--- | :--- | :--- |
| **`solo_banter.json`** | 96 câu (16 câu/nhân vật) | `{ version, description, items: [{ id, character_id, category, episode_ref, text, face_expression, body_gesture }] }`. Trong đó `category` gồm 3 nhóm: `iconic_classic`, `deep_cut_lore`, `office_mood`. |
| **`duo_skits.json`** | 36 tiểu phẩm (phủ đủ 15/15 cặp) | `{ version, description, skits: [{ id, title, participants: [charA, charB], episode_ref, preferred_zone, lines: DialogueLine[] }] }`. Mỗi tiểu phẩm có 4–6 lượt thoại. |
| **`group_skits.json`** | 22 tiểu phẩm (3–6 nhân vật) | `{ version, description, skits: [{ id, title, pattern, participants, mid_joiner, episode_ref, preferred_zone, lines: DialogueLine[] }] }`. Mỗi tiểu phẩm có 5–8 lượt thoại. Trường `mid_joiner` có dạng `null` hoặc `{ character_id, join_at_turn, approach_style }` để 3D engine điều khiển nhân vật chạy từ xa tới chen ngang đúng lượt thoại. |
| **`zone_interactions.json`** | 36 tương tác (3/vị trí × 12 vị trí) | `{ version, description, zones: string[], interactions: [{ id, zone_id, zone_label, trigger_type, participants, episode_ref, lines: DialogueLine[] }] }`. `trigger_type` gồm `click_prop`, `proximity_idle`, `easter_egg`. |
| **`context_reactions.json`** | 120 phản ứng theo ngữ cảnh | Gồm 3 nhánh:<br>• `time_of_day_greetings`: `morning \| noon \| afternoon \| evening` → theo từng `character_id` → mảng câu chào sếp Bông.<br>• `poke_reactions`: theo từng `character_id` → `level_1 \| level_2 \| level_3` (tăng cấp khi chạm liên tục).<br>• `work_events`: `on_task_start \| on_approval_ready \| on_saved_to_drive` → theo từng `character_id`. |

---

## 3. Gợi ý tích hợp vào Three.js (Giai đoạn 3)

1. Import trực tiếp 5 file JSON vào Frontend (Vite bundle sẵn, **0 API call, 0 token AI**).
2. Khi một sự kiện xảy ra (nhân vật `IDLE` tụ tập gần nhau, người dùng bấm đạo cụ, chạm nhân vật, đổi khung giờ hoặc nhận sự kiện Realtime từ Supabase), chọn ngẫu nhiên 1 mục tương ứng và loại trừ ID vừa phát gần nhất để tránh lặp.
3. Với mỗi `line` trong `lines`:
   - Nếu `mid_joiner && index === mid_joiner.join_at_turn`, kích hoạt pathfinding cho `mid_joiner.character_id` chạy tới điểm tụ tập trước khi hiển thị thoại.
   - Nếu có `delay_ms`, chờ đúng số mili-giây trước khi bật bong bóng thoại (ví dụ hiệu ứng chậm hiểu của Joey).
   - Đồng bộ phát đồng thời `face_expression` (biểu cảm khuôn mặt 3D) và `body_gesture` (động tác khung xương 3D).
