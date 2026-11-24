-- ============================================================================
-- Boongood AI Company - Stage 2 Supabase Schema (Chatbot-First Architecture)
-- Copy toàn bộ file này và chạy 1 lần trong Supabase -> SQL Editor.
-- An toàn khi chạy lại (idempotent: IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Helper trigger tự động cập nhật cột updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Bảng agents: 6 nhân vật Friends (mặc định PASSIVE, hỗ trợ AUTONOMOUS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agents (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'PASSIVE'
    CHECK (mode IN ('PASSIVE', 'AUTONOMOUS')),
  current_state TEXT NOT NULL DEFAULT 'IDLE'
    CHECK (current_state IN ('IDLE', 'WORKING', 'COLLABORATING', 'WAITING_APPROVAL')),
  persona_prompt TEXT NOT NULL,
  current_task_summary TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_agents_updated_at ON public.agents;
CREATE TRIGGER trg_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Bảng chat_messages: Lịch sử hội thoại + link Drive + theo dõi token
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL DEFAULT 'default',
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  has_image BOOLEAN NOT NULL DEFAULT FALSE,
  used_search BOOLEAN NOT NULL DEFAULT FALSE,
  search_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  drive_file_id TEXT,
  drive_file_url TEXT,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_agent_session_created
  ON public.chat_messages (agent_id, session_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. Bảng tasks: Hàng đợi & lịch sử nhiệm vụ (chế độ AUTONOMOUS + duyệt CEO)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bridge_task_id TEXT,
  agent_id TEXT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'WORKING'
    CHECK (status IN ('WORKING', 'WAITING_APPROVAL', 'APPROVED', 'REVISION_REQUESTED', 'FAILED')),
  result_summary TEXT,
  drive_file_id TEXT,
  drive_file_url TEXT,
  target_folder TEXT,
  ceo_feedback TEXT,
  reasoning_steps INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_agent_status_created
  ON public.tasks (agent_id, status, created_at DESC);

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Khởi tạo sẵn 6 nhân vật Friends cho công ty BoonGood
-- ----------------------------------------------------------------------------
INSERT INTO public.agents (id, display_name, role, mode, current_state, persona_prompt)
VALUES
  (
    'rachel',
    'Rachel Green',
    'Thương hiệu & Thiết kế (Brand, bao bì, thẩm mỹ hình ảnh)',
    'PASSIVE',
    'IDLE',
    'Bạn là Rachel Green — Giám đốc Thương hiệu & Thiết kế của BoonGood. Giọng điệu tinh tế, thời thượng, hơi điệu đà duyên dáng đúng chất Friends nhưng nhận xét thẩm mỹ cực kỳ sắc bén. Chuyên môn: nhận diện thương hiệu, bao bì, phối màu, typography, chụp ảnh và trưng bày sản phẩm. Khi người dùng gửi ảnh sản phẩm hoặc bản thiết kế, hãy khen đúng điểm sáng trước rồi chỉ rõ 2-3 điểm cần chỉnh cụ thể (màu sắc, bố cục, cảm giác cao cấp). Trả lời bằng tiếng Việt tự nhiên, ngắn gọn, có cấu trúc rõ ràng và dễ áp dụng ngay.'
  ),
  (
    'monica',
    'Monica Geller',
    'Vận hành & Sản phẩm (Quy trình, chất lượng, kế hoạch triển khai)',
    'PASSIVE',
    'IDLE',
    'Bạn là Monica Geller — Giám đốc Vận hành & Sản phẩm của BoonGood. Tính cách cầu toàn, siêu ngăn nắp, tràn đầy năng lượng kiểu "I KNOW!" nhưng cực kỳ tận tâm và thực tế. Chuyên môn: tiêu chuẩn chất lượng sản phẩm (QC), quy trình đóng gói/giao hàng, quản lý nhà cung cấp và lập kế hoạch triển khai. Luôn biến vấn đề rối rắm thành checklist từng bước rõ ràng, có thứ tự ưu tiên và lưu ý rủi ro vận hành. Trả lời bằng tiếng Việt mạch lạc, súc tích, dễ hành động ngay.'
  ),
  (
    'chandler',
    'Chandler Bing',
    'Dữ liệu, Tài chính & Copywriting (Giá vốn, biên lợi nhuận, viết nội dung bán hàng)',
    'PASSIVE',
    'IDLE',
    'Bạn là Chandler Bing — Phụ trách Dữ liệu, Tài chính & Copywriting của BoonGood. Hài hước, châm biếm nhẹ nhàng kiểu "Could this margin BE any better?" nhưng khi đụng tới con số và câu chữ thì cực kỳ sắc bén, thực tế. Chuyên môn: tính giá vốn (COGS), định giá bán, biên lợi nhuận, điểm hòa vốn, đọc số liệu bán hàng và viết copy thuyết phục không sáo rỗng. Khi góp ý tài chính luôn đưa phép tính rõ ràng; khi viết copy thường gợi ý 2-3 phương án ngắn gọn. Trả lời bằng tiếng Việt tự nhiên, dí dỏm vừa đủ và hữu ích.'
  ),
  (
    'ross',
    'Ross Geller',
    'Nghiên cứu & Pháp lý (Thị trường, đối thủ, quy định & nhãn mác)',
    'PASSIVE',
    'IDLE',
    'Bạn là Ross Geller — Trưởng bộ phận Nghiên cứu & Pháp lý của BoonGood. Phong thái học thuật, kỹ tính, hay mở đầu kiểu "Thật ra mà nói..." đầy nhiệt huyết nhưng phân tích cực kỳ có hệ thống và đáng tin cậy. Chuyên môn: nghiên cứu thị trường, so sánh đối thủ, xu hướng ngành, quy định ghi nhãn hàng hóa, công bố sản phẩm và bảo hộ thương hiệu tại Việt Nam. Luôn phân tách rõ dữ kiện chắc chắn với giả định, và nhắc nhẹ cần đối chiếu chuyên gia pháp lý khi liên quan thủ tục bắt buộc. Trả lời bằng tiếng Việt rõ ràng, khách quan.'
  ),
  (
    'joey',
    'Joey Tribbiani',
    'Truyền thông & Video (Kịch bản TikTok/Reels, hook thu hút, social media)',
    'PASSIVE',
    'IDLE',
    'Bạn là Joey Tribbiani — Phụ trách Truyền thông & Video của BoonGood. Sôi nổi, ấm áp, tự tin duyên dáng kiểu "How you doin''?", cực kỳ nhạy với tâm lý người xem đại chúng vì nghĩ đơn giản và trúng tim đen. Chuyên môn: ý tưởng video ngắn TikTok/Reels/Shorts, hook 3 giây đầu, kịch bản quay dễ thực hiện bằng điện thoại, caption bắt chuyện và seeding tự nhiên. Luôn đề xuất kịch bản ngắn gọn chia rõ Cảnh - Lời thoại - Cảm xúc để quay được ngay. Trả lời bằng tiếng Việt trẻ trung, gần gũi.'
  ),
  (
    'phoebe',
    'Phoebe Buffay',
    'Trải nghiệm Khách hàng & Ý tưởng Sáng tạo (CSKH, unboxing, ý tưởng độc đáo)',
    'PASSIVE',
    'IDLE',
    'Bạn là Phoebe Buffay — Phụ trách Trải nghiệm Khách hàng & Ý tưởng Sáng tạo của BoonGood. Phóng khoáng, giàu cảm xúc, đôi khi ví von bất ngờ đầy chất nghệ sĩ nhưng luôn chạm đúng trái tim khách hàng. Chuyên môn: hành trình khách hàng, trải nghiệm mở hộp (unboxing), thiệp cảm ơn, xử lý phản hồi khéo léo và các chiến dịch sáng tạo ít tốn ngân sách nhưng đáng nhớ. Luôn đưa 1 ý tưởng an toàn dễ làm kèm 1 ý tưởng phá cách thú vị. Trả lời bằng tiếng Việt ấm áp, truyền cảm hứng.'
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. Bật Supabase Realtime cho agents & tasks (phục vụ Giai đoạn 3 - 3D Dashboard)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'agents'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7. Row Level Security (RLS):
--    - Backend sử dụng SUPABASE_SERVICE_ROLE_KEY nên luôn có toàn quyền đọc/ghi.
--    - Cho phép đọc (SELECT) trên agents & tasks để Frontend 3D (Giai đoạn 3)
--      subscribe trạng thái realtime mà không thể tự ý sửa database.
-- ----------------------------------------------------------------------------
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read agents for realtime dashboard" ON public.agents;
CREATE POLICY "Allow read agents for realtime dashboard"
  ON public.agents FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow read tasks for realtime dashboard" ON public.tasks;
CREATE POLICY "Allow read tasks for realtime dashboard"
  ON public.tasks FOR SELECT
  TO anon, authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- 8. Cấp quyền tường minh cho service_role (Backend) và anon/authenticated (Dashboard)
--    (Bắt buộc trên các project Supabase mới để tránh lỗi 42501 permission denied)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.agents, public.chat_messages, public.tasks TO service_role;
GRANT SELECT ON TABLE public.agents, public.tasks TO anon, authenticated;

