#!/usr/bin/env python3
"""
Kiểm thử tích hợp cho Boongood AI Company - Layer 1 Workspace Bridge.

Chạy lần lượt cả 4 hành động của workspace-bridge/Code.gs:
  1. create_doc   -> Tạo báo cáo Google Docs trong 00_Inbox_Drafts + ghi Tasks_Log
  2. append_sheet -> Ghi dữ liệu mẫu vào tab Market_Data và Finance_Models
  3. save_file    -> Lưu file prototype HTML vào 00_Inbox_Drafts + ghi Tasks_Log
  4. approve_file -> Duyệt & chuyển file sang thư mục đích + cập nhật APPROVED

Yêu cầu biến môi trường (KHÔNG hardcode trong mã nguồn):
  - BRIDGE_URL: Web App URL của Google Apps Script (kết thúc bằng /exec)
  - BRIDGE_SECRET: Giá trị API_SECRET trong Script Properties
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from typing import Any

import requests


TIMEOUT_SECONDS = 30


def get_env_config() -> tuple[str, str]:
    bridge_url = os.environ.get("BRIDGE_URL", "").strip()
    bridge_secret = os.environ.get("BRIDGE_SECRET", "").strip()

    missing = []
    if not bridge_url:
        missing.append("BRIDGE_URL")
    if not bridge_secret:
        missing.append("BRIDGE_SECRET")

    if missing:
        print(f"[ERROR] Thiếu biến môi trường: {', '.join(missing)}", file=sys.stderr)
        print("Hãy thiết lập trước khi chạy, ví dụ:", file=sys.stderr)
        print(
            '  export BRIDGE_URL="https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec"',
            file=sys.stderr,
        )
        print('  export BRIDGE_SECRET="<API_SECRET_TRONG_SCRIPT_PROPERTIES>"', file=sys.stderr)
        sys.exit(1)

    return bridge_url, bridge_secret


def call_bridge(bridge_url: str, bridge_secret: str, payload: dict[str, Any]) -> dict[str, Any]:
    request_body = {**payload, "api_secret": bridge_secret}
    response = requests.post(
        bridge_url,
        json=request_body,
        timeout=TIMEOUT_SECONDS,
        allow_redirects=True,
    )

    if response.status_code != 200:
        raise RuntimeError(
            f"HTTP {response.status_code} từ Workspace Bridge: {response.text[:300]}"
        )

    try:
        data = response.json()
    except ValueError as exc:
        preview = response.text[:250].replace("\n", " ")
        raise RuntimeError(
            "Phản hồi không phải JSON hợp lệ (kiểm tra lại quyền Deploy Web App phải là "
            f"'Anyone'). Nội dung nhận được: {preview}"
        ) from exc

    if not data.get("ok"):
        raise RuntimeError(f"Bridge trả về lỗi: {data.get('error', data)}")

    return data


def main() -> int:
    bridge_url, bridge_secret = get_env_config()
    run_tag = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")

    print("=== BẮT ĐẦU KIỂM THỬ BOONGOOD WORKSPACE BRIDGE ===")
    print(f"Endpoint: {bridge_url}")
    print(f"Run Tag : {run_tag}\n")

    results: list[tuple[str, str]] = []

    try:
        # ------------------------------------------------------------------
        # 1. TEST create_doc
        # ------------------------------------------------------------------
        print("[1/4] Testing action: create_doc ...")
        doc_res = call_bridge(
            bridge_url,
            bridge_secret,
            {
                "action": "create_doc",
                "task_id": f"TEST-DOC-{run_tag}",
                "agent_name": "Market_Research_Agent",
                "goal": "Khảo sát thị trường sản phẩm gia dụng thông minh Q4",
                "title": f"[TEST] Báo cáo Nghiên cứu Thị trường Boongood ({run_tag})",
                "summary": "Báo cáo giả lập phân tích 2 đối thủ chính và đề xuất định vị giá.",
                "sections": [
                    {
                        "heading": "Tóm tắt điều hành",
                        "body": (
                            "Báo cáo này được tạo tự động bởi kịch bản test_bridge.py nhằm xác minh "
                            "khả năng tạo Google Docs định dạng sạch trong thư mục 00_Inbox_Drafts."
                        ),
                    },
                    {
                        "heading": "Phát hiện chính về thị trường",
                        "bullets": [
                            "Phân khúc tầm trung tăng trưởng 22% so với cùng kỳ.",
                            "Khách hàng ưu tiên thiết kế tối giản và bảo hành rõ ràng.",
                            "Kênh bán hàng kết hợp nội dung video ngắn có tỷ lệ chuyển đổi cao nhất.",
                        ],
                    },
                    {
                        "heading": "Đề xuất bước tiếp theo cho CEO",
                        "body": (
                            "Đề xuất duyệt tài liệu này để lưu trữ vào thư mục 01_Market_Research "
                            "và triển khai bước thiết kế prototype landing page."
                        ),
                    },
                ],
            },
        )
        doc_file_id = doc_res["file_id"]
        doc_task_id = doc_res["task_id"]
        print(f"  [PASS] Created Doc: {doc_res['file_url']}")
        print(f"         file_id={doc_file_id}, task_id={doc_task_id}\n")
        results.append(("Google Doc (01_Market_Research)", doc_res["file_url"]))

        # ------------------------------------------------------------------
        # 2. TEST append_sheet (Market_Data & Finance_Models)
        # ------------------------------------------------------------------
        print("[2/4] Testing action: append_sheet (Market_Data & Finance_Models) ...")
        market_res = call_bridge(
            bridge_url,
            bridge_secret,
            {
                "action": "append_sheet",
                "sheet_name": "Market_Data",
                "rows": [
                    {
                        "Competitor_Name": "Competitor Alpha",
                        "Product": "Bình giữ nhiệt Smart Cup 500ml",
                        "Price": 390000,
                        "USP": "Hiển thị nhiệt độ nắp LED",
                        "Source_URL": "https://example.com/alpha-cup",
                        "Notes": f"Dữ liệu test tự động ({run_tag})",
                    },
                    {
                        "Competitor_Name": "Competitor Beta",
                        "Product": "Bình giữ nhiệt Eco Flask 600ml",
                        "Price": 450000,
                        "USP": "Vỏ thép tái chế, bảo hành 24 tháng",
                        "Source_URL": "https://example.com/beta-flask",
                        "Notes": f"Dữ liệu test tự động ({run_tag})",
                    },
                ],
            },
        )
        print(
            f"  [PASS] Market_Data (+{market_res['rows_added']} rows): {market_res['sheet_url']}"
        )
        results.append(("Sheet Market_Data", market_res["sheet_url"]))

        finance_res = call_bridge(
            bridge_url,
            bridge_secret,
            {
                "action": "append_sheet",
                "sheet_name": "Finance_Models",
                "rows": [
                    {
                        "Item_Name": f"Boongood Starter Kit ({run_tag})",
                        "Cost_COGS": 145000,
                        "Selling_Price": 349000,
                        "Margin_Percent": 58.45,
                        "Notes": "Biên lợi nhuận khai báo tường minh",
                    },
                    {
                        "Item_Name": f"Boongood Pro Bundle ({run_tag})",
                        "Cost_COGS": 240000,
                        "Selling_Price": 599000,
                        # Bỏ trống Margin_Percent để kiểm tra tính năng tự tính trên Apps Script
                        "Notes": "Tự động tính Margin_Percent từ COGS và Selling_Price",
                    },
                ],
            },
        )
        print(
            f"  [PASS] Finance_Models (+{finance_res['rows_added']} rows): {finance_res['sheet_url']}\n"
        )
        results.append(("Sheet Finance_Models", finance_res["sheet_url"]))

        # ------------------------------------------------------------------
        # 3. TEST save_file (HTML prototype)
        # ------------------------------------------------------------------
        print("[3/4] Testing action: save_file ...")
        prototype_html = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Boongood Prototype ({run_tag})</title>
</head>
<body>
  <main style="font-family: sans-serif; max-width: 680px; margin: 40px auto;">
    <h1>Boongood Product Landing Prototype</h1>
    <p>Bản mẫu HTML tạo tự động bởi <code>test_bridge.py</code> lúc {run_tag} UTC.</p>
  </main>
</body>
</html>
"""
        save_res = call_bridge(
            bridge_url,
            bridge_secret,
            {
                "action": "save_file",
                "task_id": f"TEST-PROTO-{run_tag}",
                "agent_name": "Prototype_Agent",
                "goal": "Tạo bản mẫu HTML trang giới thiệu sản phẩm",
                "file_name": f"boongood_prototype_{run_tag}.html",
                "content": prototype_html,
                "summary": "Prototype HTML cơ bản gửi CEO kiểm tra.",
            },
        )
        proto_file_id = save_res["file_id"]
        proto_task_id = save_res["task_id"]
        print(f"  [PASS] Saved File: {save_res['file_url']}")
        print(f"         file_id={proto_file_id}, mime_type={save_res['mime_type']}\n")
        results.append(("HTML Prototype (02_Prototypes_Drafts)", save_res["file_url"]))

        # ------------------------------------------------------------------
        # 4. TEST approve_file (Di chuyển file & cập nhật APPROVED trong Tasks_Log)
        # ------------------------------------------------------------------
        print("[4/4] Testing action: approve_file ...")
        approve_doc_res = call_bridge(
            bridge_url,
            bridge_secret,
            {
                "action": "approve_file",
                "file_id": doc_file_id,
                "task_id": doc_task_id,
                "target_folder": "01_Market_Research",
                "ceo_feedback": "Đã duyệt tự động qua test_bridge.py - nội dung đạt yêu cầu.",
            },
        )
        print(
            f"  [PASS] Approved Doc -> {approve_doc_res['target_folder']} "
            f"(status={approve_doc_res['status']}, tasks_log_updated={approve_doc_res['tasks_log_updated']})"
        )

        approve_proto_res = call_bridge(
            bridge_url,
            bridge_secret,
            {
                "action": "approve_file",
                "file_id": proto_file_id,
                "task_id": proto_task_id,
                "target_folder": "02_Prototypes_Drafts",
                "ceo_feedback": "Prototype đạt chuẩn, duyệt chuyển sang 02_Prototypes_Drafts.",
            },
        )
        print(
            f"  [PASS] Approved Prototype -> {approve_proto_res['target_folder']} "
            f"(status={approve_proto_res['status']}, tasks_log_updated={approve_proto_res['tasks_log_updated']})\n"
        )

    except Exception as exc:
        print(f"\n[FAIL] Kiểm thử thất bại: {exc}", file=sys.stderr)
        return 1

    print("=== TẤT CẢ 4/4 HÀNH ĐỘNG ĐỀU THÀNH CÔNG ===")
    print("Bạn có thể mở trực tiếp các đường dẫn sau để kiểm tra trên Google Drive/Sheets:")
    for label, url in results:
        print(f"  - {label}: {url}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
