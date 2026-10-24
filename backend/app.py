from datetime import datetime
import os
import shutil


from datetime import datetime
import os
import shutil

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

import google.generativeai as genai
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from sheets_db import (
    init_sheets,
    upsert_chat,
    find_service_by_mobile,
    find_service_by_job_card,
    service_row_to_api,
    list_faq,
    save_workshop,
    save_test_drive,
    save_ticket,
    normalize_phone,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Autoveer Chatbot API", version="3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://raviranjands.github.io",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

init_sheets()


class ChatLogRequest(BaseModel):
    session_id: str
    mobile: str = ""
    message: str


class TrackServiceRequest(BaseModel):
    mobile: str = ""
    job_card_no: str = ""


class WorkshopRequest(BaseModel):
    service_date: str
    workshop_location: str
    brand_vehicle_type: str
    registration_no: str
    customer_name: str
    customer_mobile: str
    job_card_no: str = ""
    service_type: str
    vehicle_washing: str
    repairing: str
    repair_details: str = ""
    labour_amount: float = 0
    parts_amount: float = 0
    amc_amount: float = 0
    remarks: str = ""


class TestDriveRequest(BaseModel):
    customer_name: str
    customer_mobile: str
    vehicle_brand: str
    vehicle_model: str
    preferred_branch: str
    preferred_date: str = ""
    consent_contact: str = "Yes"
    notes: str = ""


class TicketRequest(BaseModel):
    mobile: str
    category: str
    description: str
    urgent: str = "No"
    photo_url: str = ""


class ChatAIRequest(BaseModel):
    message: str


@app.get("/")
def health():
    from sheets_db import spreadsheet

    return {
        "status": "ok",
        "app": "Autoveer Chatbot",
        "database": "google_sheets",
        "sheets_connected": spreadsheet is not None,
    }


@app.post("/chat-log")
def chat_log(data: ChatLogRequest):
    upsert_chat(data.session_id, data.mobile, data.message)
    return {"status": "saved"}


@app.post("/track-service")
def track_service(data: TrackServiceRequest):
    row = None
    if data.job_card_no.strip():
        row = find_service_by_job_card(data.job_card_no)
    elif data.mobile.strip():
        row = find_service_by_mobile(data.mobile)
    if not row:
        return {"found": False}
    return service_row_to_api(row)


@app.get("/faq")
def faq():
    records = list_faq()
    return records


@app.post("/workshop")
def workshop(data: WorkshopRequest):
    if not normalize_phone(data.customer_mobile):
        raise HTTPException(status_code=400, detail="Invalid mobile number")
    ref = save_workshop(data.model_dump())
    total = data.labour_amount + data.parts_amount + data.amc_amount
    return {"status": "success", "reference_id": ref, "total_amount": total}


@app.post("/test-drive")
def test_drive(data: TestDriveRequest):
    if data.consent_contact != "Yes":
        raise HTTPException(status_code=400, detail="Contact consent required")
    booking_id = save_test_drive(data.model_dump())
    return {
        "status": "success",
        "booking_id": booking_id,
        "message": "Team will call you to confirm test drive.",
    }


@app.post("/ticket")
def ticket(data: TicketRequest):
    ticket_id = save_ticket(data.model_dump())
    return {
        "status": "success",
        "ticket_id": ticket_id,
        "created_on": datetime.now().strftime("%d %b %Y, %I:%M %p"),
    }


@app.post("/upload-photo")
async def upload_photo(request: Request, file: UploadFile = File(...)):
    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb+") as out:
        shutil.copyfileobj(file.file, out)
    return {"status": "success", "url": str(request.base_url) + f"static/uploads/{filename}"}


api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)


@app.post("/chat-ai")
def chat_ai(data: ChatAIRequest):
    if not api_key:
        return {"reply": "AI is not configured. Call 9812000912 for help."}
    prompt = f"""You are Autoveer Drive Assist for Autoveer Pvt Ltd (autoveer.com).
Dealer for Nissan, Bajaj, Ashok Leyland, Massey Ferguson in Haryana.
Branches: Rohtak, Karnal, Bhiwani, Kurukshetra, Ladwa, Bahadurgarh, Jhajjar, Charkhi Dadri.
Phone: 9812000912.

Workshop locations (PDF):
- Karnal: Bajaj 2 Wheeler
- Kurukshetra, Rohtak, Bhiwani: Bajaj 3 Wheeler
- Rohtak, Bahadurgarh: Ashok Leyland Commercial Vehicle

Help only with vehicles, service, test drives, workshops, finance, parts, branches.
If off-topic, say you only help with Autoveer automobiles and share 9812000912.
Keep answers short. User: {data.message}"""
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        reply = model.generate_content(prompt).text
        return {"reply": reply}
    except Exception:
        return {"reply": "Sorry, please try again or call 9812000912."}
