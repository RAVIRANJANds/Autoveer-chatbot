"""Google Sheets data layer for Autoveer chatbot."""

import os
from datetime import datetime

import gspread
from google.oauth2.service_account import Credentials
from fastapi import HTTPException

from sheets_config import (
    GOOGLE_SHEET_ID,
    TAB_CHAT,
    TAB_SERVICE,
    TAB_WORKSHOP,
    TAB_TEST_DRIVE,
    TAB_TICKETS,
    TAB_FAQ,
    HEADERS,
)

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
spreadsheet = None


def _creds_path():
    if os.path.exists("/etc/secrets/credentials.json"):
        return "/etc/secrets/credentials.json"
    return os.path.join(BASE_DIR, "Data", "credentials.json")


def init_sheets():
    global spreadsheet
    if not GOOGLE_SHEET_ID:
        print("WARNING: GOOGLE_SHEET_ID not set in backend/.env")
        return
    path = _creds_path()
    if not os.path.exists(path):
        print(f"WARNING: credentials not found at {path}")
        return
    creds = Credentials.from_service_account_file(path, scopes=SCOPES)
    client = gspread.authorize(creds)
    spreadsheet = client.open_by_key(GOOGLE_SHEET_ID)
    print("Google Sheets connected:", spreadsheet.title)


def require_sheet():
    if spreadsheet is None:
        raise HTTPException(
            status_code=503,
            detail="Google Sheets not connected. Set GOOGLE_SHEET_ID and credentials.json",
        )


def worksheet(name: str):
    require_sheet()
    try:
        return spreadsheet.worksheet(name)
    except gspread.WorksheetNotFound:
        raise HTTPException(
            status_code=503,
            detail=f'Missing worksheet "{name}". See GOOGLE_SHEETS_SETUP.txt',
        )


def normalize_phone(phone_str: str) -> str:
    s = str(phone_str or "").strip()
    if s.endswith(".0"):
        s = s[:-2]
    s = "".join(c for c in s if c.isdigit())
    return s[-10:] if len(s) >= 10 else s


def now_str():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def append_row(tab: str, values: list):
    ws = worksheet(tab)
    ws.append_row(values, value_input_option="USER_ENTERED")


def upsert_chat(session_id: str, mobile: str, message: str):
    ws = worksheet(TAB_CHAT)
    rows = ws.get_all_values()
    ts = now_str()
    for i in range(1, len(rows)):
        if len(rows[i]) > 1 and rows[i][1] == session_id:
            transcript = rows[i][3] if len(rows[i]) > 3 else ""
            new_text = f"{transcript}\n{message}".strip() if transcript else message
            ws.update_cell(i + 1, 1, ts)
            ws.update_cell(i + 1, 3, mobile or rows[i][2])
            ws.update_cell(i + 1, 4, new_text)
            return
    append_row(
        TAB_CHAT,
        [ts, session_id, mobile, message, "Autoveer Chatbot"],
    )


def find_service_by_mobile(mobile: str):
    ws = worksheet(TAB_SERVICE)
    records = ws.get_all_records()
    target = normalize_phone(mobile)
    match = None
    for row in records:
        if normalize_phone(row.get("Mobile", "")) == target:
            match = row
    return match


def find_service_by_job_card(job_card: str):
    ws = worksheet(TAB_SERVICE)
    records = ws.get_all_records()
    key = str(job_card or "").strip().upper()
    for row in records:
        if str(row.get("Job_Card_No", "")).strip().upper() == key:
            return row
    return None


def service_row_to_api(row: dict) -> dict:
    brand = str(row.get("Vehicle_Brand", "")).strip()
    model = str(row.get("Vehicle_Model", "")).strip()
    vehicle = f"{brand} {model}".strip() or "Vehicle"
    return {
        "found": True,
        "job_card_no": str(row.get("Job_Card_No", "")),
        "customer_name": str(row.get("Customer_Name", "")),
        "mobile": str(row.get("Mobile", "")),
        "vehicle": vehicle,
        "registration_no": str(row.get("Registration_No", "")),
        "service_status": str(row.get("Service_Status", "")),
        "workshop_location": str(row.get("Workshop_Location", "")),
        "expected_date": str(row.get("Expected_Date", "")),
        "status_notes": str(row.get("Status_Notes", "")),
        "service_type": str(row.get("Service_Type", "")),
    }


def list_faq():
    ws = worksheet(TAB_FAQ)
    return ws.get_all_records()


def save_workshop(data: dict) -> str:
    ref = "WS" + datetime.now().strftime("%Y%m%d%H%M%S")
    total = (
        float(data.get("labour_amount") or 0)
        + float(data.get("parts_amount") or 0)
        + float(data.get("amc_amount") or 0)
    )
    append_row(
        TAB_WORKSHOP,
        [
            now_str(),
            data.get("service_date"),
            data.get("workshop_location"),
            data.get("brand_vehicle_type"),
            data.get("registration_no"),
            data.get("customer_name"),
            data.get("customer_mobile"),
            data.get("job_card_no"),
            data.get("service_type"),
            data.get("vehicle_washing"),
            data.get("repairing"),
            data.get("repair_details", ""),
            data.get("labour_amount"),
            data.get("parts_amount"),
            data.get("amc_amount"),
            total,
            data.get("remarks", ""),
            "Autoveer Chatbot",
        ],
    )
    return ref


def save_test_drive(data: dict) -> str:
    booking_id = "TD" + datetime.now().strftime("%Y%m%d%H%M%S")
    append_row(
        TAB_TEST_DRIVE,
        [
            now_str(),
            booking_id,
            data.get("customer_name"),
            data.get("customer_mobile"),
            data.get("vehicle_brand"),
            data.get("vehicle_model"),
            data.get("preferred_branch"),
            data.get("preferred_date", ""),
            data.get("consent_contact", "Yes"),
            data.get("notes", ""),
            "Autoveer Chatbot",
        ],
    )
    return booking_id


def save_ticket(data: dict) -> str:
    ticket_id = "TKT" + datetime.now().strftime("%Y%m%d%H%M%S")
    append_row(
        TAB_TICKETS,
        [
            now_str(),
            data.get("mobile"),
            ticket_id,
            data.get("category"),
            data.get("description"),
            data.get("urgent", "No"),
            data.get("photo_url", ""),
            "Open",
            "Autoveer Chatbot",
        ],
    )
    return ticket_id
