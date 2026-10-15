"use strict";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";
const CAL_COM_LINK = "YOUR_USERNAME/YOUR_EVENT_SLUG";

const form = document.getElementById("demo-form");
const fields = document.getElementById("form-fields");
const status = document.getElementById("form-status");
const submitLabel = document.getElementById("submit-label");
const spinner = document.getElementById("submit-spinner");
const leadCapture = document.getElementById("lead-capture");
const scheduling = document.getElementById("scheduling");
const calendarStatus = document.getElementById("calendar-status");
const bookingFallback = document.getElementById("booking-fallback");

let submitting = false;
let accepted = false;

function configurationReady() {
  const endpoint = new URL(FORMSPREE_ENDPOINT);
  return (
    endpoint.origin === "https://formspree.io" &&
    /^\/f\/[a-zA-Z0-9]+$/.test(endpoint.pathname) &&
    !FORMSPREE_ENDPOINT.includes("YOUR_") &&
    !CAL_COM_LINK.includes("YOUR_") &&
    /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)+$/.test(CAL_COM_LINK)
  );
}

function setSubmitting(pending) {
  submitting = pending;
  fields.disabled = pending;
  form.setAttribute("aria-busy", String(pending));
  spinner.hidden = !pending;
  submitLabel.textContent = pending
    ? "Submitting request…"
    : "Request Private Demo →";
}

function showFormError(message) {
  status.classList.add("error");
  status.textContent = message;
}

function loadCal() {
  return new Promise((resolve, reject) => {
    if (window.Cal) {
      resolve();
      return;
    }

    const queue = [];

    window.Cal = function (...command) {
      queue.push(command);
    };

    window.Cal.q = queue;
    window.Cal.ns = {};
    window.Cal.loaded = true;

    window.Cal("init", { origin: "https://cal.com" });

    const script = document.createElement("script");
    script.src = "https://app.cal.com/embed/embed.js";
    script.async = true;

    const timer = window.setTimeout(() => {
      reject(new Error("Calendar loading timed out."));
    }, 15000);

    script.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };

    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Calendar script could not load."));
    };

    document.head.appendChild(script);
  });
}

async function showScheduling(details) {
  leadCapture.hidden = true;
  scheduling.hidden = false;

  document.getElementById("confirmation-heading").focus();

  bookingFallback.href = `https://cal.com/${CAL_COM_LINK}`;

  calendarStatus.textContent = "Loading scheduling…";

  try {
    await loadCal();

    window.Cal("inline", {
      elementOrSelector: "#cal-inline",
      calLink: CAL_COM_LINK,
      config: {
        name: details.name,
        email: details.email,
        theme: "dark",
        layout: "month_view"
      }
    });

    window.Cal("ui", {
      theme: "dark",
      layout: "month_view",
      hideEventTypeDetails: false,
      cssVarsPerTheme: {
        dark: { "cal-brand": "#059669" },
        light: { "cal-brand": "#059669" }
      }
    });

    calendarStatus.textContent =
      "Select an available time below. If the calendar does not appear, use the scheduling link.";
  } catch {
    calendarStatus.classList.add("error");
    calendarStatus.textContent =
      "Your request was received, but the calendar could not load. Please use the scheduling link below.";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (submitting || accepted) return;

  status.classList.remove("error");
  status.textContent = "";

  try {
    if (!configurationReady()) {
      showFormError(
        "Demo requests are not configured yet. Please email Dhunt22@ASU.edu to arrange a walkthrough."
      );
      return;
    }
  } catch {
    showFormError(
      "Demo requests are not configured correctly. Please email Dhunt22@ASU.edu."
    );
    return;
  }

  for (const fieldName of ["name", "email", "company", "message"]) {
    const input = form.elements.namedItem(fieldName);
    input.value = input.value.trim();
  }

  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const details = {
    name: String(data.get("name") || ""),
    email: String(data.get("email") || "")
  };

  setSubmitting(true);
  status.textContent = "Sending your private demo request…";

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      const messages = Array.isArray(result?.errors)
        ? result.errors
            .map((error) => error?.message)
            .filter((message) => typeof message === "string")
        : [];

      throw new Error(
        messages.join(" ") ||
        "Your request was not accepted. Please try again or email Dhunt22@ASU.edu."
      );
    }

    accepted = true;
    status.textContent = "";

  } catch (error) {
    showFormError(
      error.name === "AbortError" || error instanceof TypeError
        ? "We could not confirm receipt. Your request may have reached us. Please contact Dhunt22@ASU.edu or retry."
        : error.message
    );
  } finally {
    window.clearTimeout(timeout);
    setSubmitting(false);
  }

  if (accepted) {
    await showScheduling(details);
  }
});
