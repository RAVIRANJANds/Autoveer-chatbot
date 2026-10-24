const API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:8000"
        : "https://YOUR-BACKEND-URL.onrender.com";

const AUTOVEER_PHONE = "9812000912";
const TYPING_TEXT = "Fetching vehicle & service data…";

const BRANCHES = [
    "Rohtak",
    "Karnal",
    "Bhiwani",
    "Kurukshetra",
    "Ladwa",
    "Bahadurgarh",
    "Jhajjar",
    "Charkhi Dadri",
];

const VEHICLE_MODELS = {
    Nissan: ["Magnite", "Other Nissan model"],
    Bajaj: ["Platina", "Pulsar", "Other Bajaj model"],
    "Ashok Leyland": ["Dost", "Partner", "Other CV model"],
    "Massey Ferguson": ["241 DI", "Other tractor model"],
};

let sessionId = localStorage.getItem("av_session");
if (!sessionId) {
    sessionId = "av_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem("av_session", sessionId);
}

let userMobile = "";
let conversationState = "awaiting_mobile";

// ——— UI ———

function removeTypingBubble() {
    document.querySelector(".typing-bubble")?.closest(".msg-row")?.remove();
}

function createMessage(html, sender, options = {}) {
    const chatBody = document.getElementById("chatBody");
    const row = document.createElement("div");
    row.className = sender === "user" ? "msg-row msg-row--user" : "msg-row";

    if (sender === "bot") {
        const avatar = document.createElement("div");
        avatar.className = "bot-avatar";
        avatar.textContent = "🚗";
        const bubble = document.createElement("div");
        bubble.className = "bot-message" + (options.typing ? " typing-bubble" : "");
        bubble.innerHTML = html;
        row.appendChild(avatar);
        row.appendChild(bubble);
    } else {
        const bubble = document.createElement("div");
        bubble.className = "user-message";
        bubble.textContent = html;
        row.appendChild(bubble);
    }
    chatBody.appendChild(row);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function bot(html, options) {
    createMessage(html, "bot", options);
}
function user(text) {
    createMessage(text, "user");
}

async function logChat(message) {
    try {
        await fetch(`${API_URL}/chat-log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                mobile: userMobile,
                message,
            }),
        });
    } catch (e) {
        console.warn(e);
    }
}

function bindForm(formId, onSubmit) {
    requestAnimationFrame(() => {
        const form = document.getElementById(formId);
        if (!form) return;
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            const btn = form.querySelector('button[type="submit"]');
            if (btn) btn.disabled = true;
            try {
                await onSubmit(fd, form);
            } catch (err) {
                bot("❌ " + (err.message || "Could not save. Check Google Sheet setup."));
            } finally {
                if (btn) btn.disabled = false;
            }
        });
    });
}

// ——— Workshop (PDF) ———

function workshopLocationOptions() {
    return `
    <option value="">Select workshop</option>
    <option value="Karnal|Bajaj 2 Wheeler">Karnal — Bajaj 2 Wheeler</option>
    <option value="Kurukshetra|Bajaj 3 Wheeler">Kurukshetra — Bajaj 3 Wheeler</option>
    <option value="Rohtak|Bajaj 3 Wheeler">Rohtak — Bajaj 3 Wheeler</option>
    <option value="Bhiwani|Bajaj 3 Wheeler">Bhiwani — Bajaj 3 Wheeler</option>
    <option value="Rohtak|Ashok Leyland Commercial Vehicle">Rohtak — Ashok Leyland CV</option>
    <option value="Bahadurgarh|Ashok Leyland Commercial Vehicle">Bahadurgarh — Ashok Leyland CV</option>`;
}

function showWorkshopForm() {
    const today = new Date().toISOString().slice(0, 10);
    bot(`
    <form id="workshopForm" class="chat-form">
      <h4 class="form-title">Workshop service proforma</h4>
      <label>Service date</label>
      <input type="date" name="service_date" value="${today}" required>

      <label>Workshop location</label>
      <select name="workshop_pair" required>${workshopLocationOptions()}</select>

      <label>Vehicle registration no.</label>
      <input type="text" name="registration_no" placeholder="HR26AB1234" required>

      <label>Customer name</label>
      <input type="text" name="customer_name" required>

      <label>Customer mobile</label>
      <input type="tel" name="customer_mobile" pattern="[6-9][0-9]{9}" value="${userMobile || ""}" required>

      <label>Job card no.</label>
      <input type="text" name="job_card_no" placeholder="Optional">

      <label>Service type</label>
      <select name="service_type" required>
        <option value="">Select type</option>
        <option>Free Service</option>
        <option>First Paid Service</option>
        <option>Paid Service</option>
        <option>AMC</option>
      </select>

      <div class="check-row">
        <label class="check-label"><input type="checkbox" name="wash" value="Yes"> Vehicle washing done</label>
      </div>
      <div class="check-row">
        <label class="check-label"><input type="checkbox" id="repairChk" name="repair" value="Yes"> Repairing done</label>
      </div>
      <label>Repair details</label>
      <textarea name="repair_details" id="repairDetails" rows="2" placeholder="If repairing checked, describe work" disabled></textarea>

      <div class="amount-grid">
        <div><label>Labour ₹</label><input type="number" name="labour_amount" min="0" step="1" value="0" class="amt"></div>
        <div><label>Parts ₹</label><input type="number" name="parts_amount" min="0" step="1" value="0" class="amt"></div>
        <div><label>AMC ₹</label><input type="number" name="amc_amount" min="0" step="1" value="0" class="amt"></div>
      </div>
      <p class="total-line">Total: ₹<span id="wsTotal">0</span></p>

      <label>Remarks</label>
      <textarea name="remarks" rows="2" placeholder="Optional notes"></textarea>

      <label class="check-label consent">
        <input type="checkbox" name="confirm_data" required>
        I confirm details are correct for workshop record
      </label>

      <button type="submit" class="form-submit">Save to workshop sheet</button>
    </form>`);

    bindForm("workshopForm", submitWorkshopForm);

    requestAnimationFrame(() => {
        const form = document.getElementById("workshopForm");
        const repairChk = document.getElementById("repairChk");
        const repairDetails = document.getElementById("repairDetails");
        const totalEl = document.getElementById("wsTotal");

        function recalc() {
            const l = parseFloat(form.labour_amount.value) || 0;
            const p = parseFloat(form.parts_amount.value) || 0;
            const a = parseFloat(form.amc_amount.value) || 0;
            totalEl.textContent = (l + p + a).toFixed(0);
        }
        form.querySelectorAll(".amt").forEach((el) => el.addEventListener("input", recalc));
        repairChk?.addEventListener("change", () => {
            repairDetails.disabled = !repairChk.checked;
            if (!repairChk.checked) repairDetails.value = "";
        });
    });
}

async function submitWorkshopForm(fd) {
    const pair = fd.get("workshop_pair").split("|");
    const payload = {
        service_date: fd.get("service_date"),
        workshop_location: pair[0],
        brand_vehicle_type: pair[1],
        registration_no: String(fd.get("registration_no")).toUpperCase(),
        customer_name: fd.get("customer_name"),
        customer_mobile: fd.get("customer_mobile"),
        job_card_no: fd.get("job_card_no") || "",
        service_type: fd.get("service_type"),
        vehicle_washing: fd.get("wash") ? "Yes" : "No",
        repairing: fd.get("repair") ? "Yes" : "No",
        repair_details: fd.get("repair_details") || "",
        labour_amount: parseFloat(fd.get("labour_amount")) || 0,
        parts_amount: parseFloat(fd.get("parts_amount")) || 0,
        amc_amount: parseFloat(fd.get("amc_amount")) || 0,
        remarks: fd.get("remarks") || "",
    };
    await logChat("Workshop form submit");
    const res = await fetch(`${API_URL}/workshop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Save failed");
    bot(`✅ <b>Workshop record saved</b><br>Reference: <b>${data.reference_id}</b><br>Total: <b>₹${data.total_amount}</b>`);
}

// ——— Test drive ———

function branchOptions() {
    return BRANCHES.map((b) => `<option value="${b}">${b}</option>`).join("");
}

function showTestDriveForm() {
    bot(`
    <form id="testDriveForm" class="chat-form">
      <h4 class="form-title">Book test drive</h4>
      <label>Your name</label>
      <input type="text" name="customer_name" required>
      <label>Mobile</label>
      <input type="tel" name="customer_mobile" pattern="[6-9][0-9]{9}" value="${userMobile || ""}" required>
      <label>Vehicle brand</label>
      <select name="vehicle_brand" id="tdBrand" required>
        <option value="">Select brand</option>
        <option>Nissan</option>
        <option>Bajaj</option>
        <option>Ashok Leyland</option>
        <option>Massey Ferguson</option>
      </select>
      <label>Model</label>
      <select name="vehicle_model" id="tdModel" required>
        <option value="">Select brand first</option>
      </select>
      <label>Preferred branch</label>
      <select name="preferred_branch" required>${branchOptions()}</select>
      <label>Preferred date</label>
      <input type="date" name="preferred_date">
      <label>Notes</label>
      <textarea name="notes" rows="2" placeholder="Time preference, etc."></textarea>
      <label class="check-label consent">
        <input type="checkbox" name="consent" value="Yes" required>
        Autoveer may call/WhatsApp me on this number
      </label>
      <button type="submit" class="form-submit">Submit test drive request</button>
    </form>`);

    bindForm("testDriveForm", submitTestDriveForm);

    requestAnimationFrame(() => {
        const brand = document.getElementById("tdBrand");
        const model = document.getElementById("tdModel");
        brand?.addEventListener("change", () => {
            const list = VEHICLE_MODELS[brand.value] || [];
            model.innerHTML =
                '<option value="">Select model</option>' +
                list.map((m) => `<option>${m}</option>`).join("");
        });
    });
}

async function submitTestDriveForm(fd) {
    const payload = {
        customer_name: fd.get("customer_name"),
        customer_mobile: fd.get("customer_mobile"),
        vehicle_brand: fd.get("vehicle_brand"),
        vehicle_model: fd.get("vehicle_model"),
        preferred_branch: fd.get("preferred_branch"),
        preferred_date: fd.get("preferred_date") || "",
        consent_contact: fd.get("consent") ? "Yes" : "No",
        notes: fd.get("notes") || "",
    };
    await logChat("Test drive form");
    const res = await fetch(`${API_URL}/test-drive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed");
    bot(`✅ <b>Test drive booked</b><br>ID: <b>${data.booking_id}</b><br>${data.message}<br>📞 ${AUTOVEER_PHONE}`);
}

// ——— Track service ———

function showTrackForm() {
    bot(`
    <form id="trackForm" class="chat-form">
      <h4 class="form-title">Track service status</h4>
      <label>Search by</label>
      <select name="search_by" id="searchBy">
        <option value="mobile">Registered mobile</option>
        <option value="jobcard">Job card number</option>
      </select>
      <label id="trackLabel">Mobile number</label>
      <input type="text" name="search_value" id="trackValue" pattern="[6-9][0-9]{9}" required>
      <button type="submit" class="form-submit">Check status</button>
    </form>`);

    bindForm("trackForm", submitTrackForm);

    requestAnimationFrame(() => {
        const sel = document.getElementById("searchBy");
        const label = document.getElementById("trackLabel");
        const input = document.getElementById("trackValue");
        sel?.addEventListener("change", () => {
            if (sel.value === "jobcard") {
                label.textContent = "Job card number";
                input.pattern = "";
                input.placeholder = "e.g. JC2026001";
            } else {
                label.textContent = "Mobile number";
                input.pattern = "[6-9][0-9]{9}";
                input.placeholder = "10-digit mobile";
            }
        });
    });
}

async function submitTrackForm(fd) {
    const by = fd.get("search_by");
    const val = String(fd.get("search_value")).trim();
    const body =
        by === "jobcard"
            ? { job_card_no: val, mobile: "" }
            : { mobile: val, job_card_no: "" };
    await logChat("Track service: " + by);
    const res = await fetch(`${API_URL}/track-service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.found) {
        bot("No service record found. Call <b>" + AUTOVEER_PHONE + "</b> with your job card.");
        return;
    }
    bot(`
    <b>Service status</b><br><br>
    👤 ${data.customer_name}<br>
    🧾 Job card: <b>${data.job_card_no}</b><br>
    🚗 ${data.vehicle} (${data.registration_no})<br>
    📍 ${data.workshop_location}<br>
    ⚙️ <b>${data.service_status}</b><br>
    📅 Expected: ${data.expected_date || "—"}<br>
    📝 ${data.status_notes || "—"}<br>
    🔧 ${data.service_type || "—"}`);
}

// ——— Complaint ———

function showComplaintForm() {
    bot(`
    <form id="complaintForm" class="chat-form">
      <h4 class="form-title">Register complaint</h4>
      <label>Category</label>
      <select name="category" required>
        <option value="">Select category</option>
        <option>Service delay</option>
        <option>Billing / estimate issue</option>
        <option>Spare parts issue</option>
        <option>Warranty claim</option>
        <option>Booking / delivery issue</option>
        <option>Workshop quality</option>
        <option>Other</option>
      </select>
      <label>Mobile</label>
      <input type="tel" name="mobile" pattern="[6-9][0-9]{9}" value="${userMobile || ""}" required>
      <label>Description</label>
      <textarea name="description" rows="3" required placeholder="Describe the issue"></textarea>
      <label class="check-label"><input type="checkbox" name="urgent" value="Yes"> Mark as urgent</label>
      <label>Photo (optional)</label>
      <input type="file" name="photo" accept="image/*" id="complaintPhoto">
      <label class="check-label consent">
        <input type="checkbox" name="confirm" required>
        Information provided is correct
      </label>
      <button type="submit" class="form-submit">Submit complaint</button>
    </form>`);

    bindForm("complaintForm", submitComplaintForm);
}

async function submitComplaintForm(fd) {
    let photoUrl = "";
    const file = fd.get("photo");
    if (file && file.size > 0) {
        const up = new FormData();
        up.append("file", file);
        const ur = await fetch(`${API_URL}/upload-photo`, { method: "POST", body: up });
        const uj = await ur.json();
        if (uj.url) photoUrl = uj.url;
    }
    const payload = {
        mobile: fd.get("mobile"),
        category: fd.get("category"),
        description: fd.get("description"),
        urgent: fd.get("urgent") ? "Yes" : "No",
        photo_url: photoUrl,
    };
    await logChat("Complaint: " + payload.category);
    const res = await fetch(`${API_URL}/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed");
    bot(`✅ Complaint registered<br>Ticket: <b>${data.ticket_id}</b><br>${data.created_on}`);
}

// ——— FAQ & menu ———

async function showFaqs() {
    bot("Loading FAQs…", { typing: true });
    try {
        const res = await fetch(`${API_URL}/faq`);
        const faqs = await res.json();
        removeTypingBubble();
        if (!faqs.length) {
            bot("No FAQs in sheet yet.");
            return;
        }
        let html = "<b>FAQs</b><br><br>";
        faqs.forEach((f, i) => {
            html += `<b>${i + 1}. ${f.Question}</b><br>${f.Answer}<br><br>`;
        });
        bot(html);
    } catch (e) {
        removeTypingBubble();
        bot("Could not load FAQ from Google Sheet.");
    }
}

function showTerms() {
    bot(`
    <b>Autoveer — terms</b><br>
    Authorised dealer: Nissan, Bajaj, Ashok Leyland, Massey Ferguson.<br>
    Workshop charges as per job card approval. Pay only official Autoveer accounts.<br>
    📞 ${AUTOVEER_PHONE} | autoveer.com`);
}

function showMainMenu() {
    bot(`
    <div class="welcome-card">
      <h3>How can we help?</h3>
      <p>Use the buttons below or ask anything about vehicles &amp; service.</p>
    </div>
    <label class="menu-select-label">Quick jump</label>
    <select class="menu-select" id="menuJump" onchange="onMenuJump(this)">
      <option value="">Choose an action…</option>
      <option value="track">Track service status</option>
      <option value="testdrive">Book test drive</option>
      <option value="workshop">Workshop proforma (PDF)</option>
      <option value="complaint">Register complaint</option>
      <option value="faq">FAQs</option>
      <option value="terms">Terms</option>
    </select>`);
}

function onMenuJump(sel) {
    const map = {
        track: "Track Service",
        testdrive: "Book Test Drive",
        workshop: "Workshop Service",
        complaint: "Raise Complaint",
        faq: "FAQs",
        terms: "Terms",
    };
    const v = sel.value;
    if (!v) return;
    sel.value = "";
    handleAction(map[v]);
}

async function handleAction(action) {
    user(action);
    await logChat(action);

    switch (action) {
        case "Track Service":
            showTrackForm();
            break;
        case "Book Test Drive":
            showTestDriveForm();
            break;
        case "Workshop Service":
            showWorkshopForm();
            break;
        case "Raise Complaint":
            showComplaintForm();
            break;
        case "FAQs":
            await showFaqs();
            break;
        case "Terms":
            showTerms();
            break;
        default:
            break;
    }
}

function selectOption(action) {
    if (
        conversationState === "awaiting_mobile" &&
        !["FAQs", "Terms", "Terms & Conditions", "Workshop Service"].includes(action)
    ) {
        bot("Please enter your 10-digit mobile number first.");
        return;
    }
    const labels = {
        "Terms & Conditions": "Terms",
        "Raise Complaint": "Raise Complaint",
        "Raise a Complaint": "Raise Complaint",
    };
    handleAction(labels[action] || action);
}

// ——— Chat input ———

async function sendMessage() {
    const input = document.getElementById("userInput");
    const text = input.value.trim();
    if (!text) return;
    user(text);
    input.value = "";

    if (conversationState === "awaiting_mobile") {
        if (!/^[6-9]\d{9}$/.test(text)) {
            bot("Enter a valid 10-digit Indian mobile number.");
            return;
        }
        userMobile = text;
        conversationState = "idle";
        await logChat("Mobile verified");
        bot(`Thanks! Mobile <b>${userMobile}</b> saved for this session.`);
        showMainMenu();
        return;
    }

    await logChat(text);
    const low = text.toLowerCase();
    if (["hi", "hello", "hey", "namaste"].includes(low)) {
        showMainMenu();
        return;
    }

    bot(TYPING_TEXT, { typing: true });
    try {
        const res = await fetch(`${API_URL}/chat-ai`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        removeTypingBubble();
        bot(data.reply);
    } catch (e) {
        removeTypingBubble();
        bot("AI unavailable. Call " + AUTOVEER_PHONE);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    bot(`
    <div class="welcome-card">
      <h3>Autoveer Drive Assist 🚗</h3>
      <p>Nissan · Bajaj · Ashok Leyland · Massey Ferguson<br>Haryana authorised dealer — sales, service &amp; workshop.</p>
      <p class="welcome-cta"><b>Enter your 10-digit mobile</b> to start.</p>
    </div>`);

    document.getElementById("userInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    });
});
