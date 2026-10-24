"""Autoveer chatbot — Google Sheets tab names & column headers (row 1)."""

import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "")

TAB_CHAT = "Chat_Log"
TAB_SERVICE = "Service_Status"
TAB_WORKSHOP = "Workshop"
TAB_TEST_DRIVE = "Test_Drive"
TAB_TICKETS = "Tickets"
TAB_FAQ = "FAQ"

HEADERS = {
    TAB_CHAT: [
        "Timestamp",
        "Session_ID",
        "Mobile",
        "Message",
        "Source",
    ],
    TAB_SERVICE: [
        "Timestamp",
        "Mobile",
        "Customer_Name",
        "Job_Card_No",
        "Vehicle_Brand",
        "Vehicle_Model",
        "Registration_No",
        "Service_Status",
        "Workshop_Location",
        "Expected_Date",
        "Status_Notes",
        "Service_Type",
    ],
    TAB_WORKSHOP: [
        "Timestamp",
        "Service_Date",
        "Workshop_Location",
        "Brand_Vehicle_Type",
        "Registration_No",
        "Customer_Name",
        "Customer_Mobile",
        "Job_Card_No",
        "Service_Type",
        "Vehicle_Washing",
        "Repairing",
        "Repair_Details",
        "Labour_Amount",
        "Parts_Amount",
        "AMC_Amount",
        "Total_Amount",
        "Remarks",
        "Source",
    ],
    TAB_TEST_DRIVE: [
        "Timestamp",
        "Booking_ID",
        "Customer_Name",
        "Mobile",
        "Vehicle_Brand",
        "Vehicle_Model",
        "Preferred_Branch",
        "Preferred_Date",
        "Consent_Contact",
        "Notes",
        "Source",
    ],
    TAB_TICKETS: [
        "Timestamp",
        "Mobile",
        "Ticket_ID",
        "Category",
        "Description",
        "Urgent",
        "Photo_URL",
        "Status",
        "Source",
    ],
    TAB_FAQ: ["Question", "Answer"],
}
