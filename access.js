"use strict";

"use strict";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mnpjopzb";
const CAL_COM_URL = "https://cal.com/derek-hunt-2fybwu/employment-interview";
const forms = [
  document.getElementById("demo-form"),
  document.getElementById("interview-form")
];
const requestChoices = [
  document.getElementById("demo-choice"),
  document.getElementById("interview-choice")
];
const scheduling = document.getElementById("scheduling");
const calendar = document.getElementById("cal-embed");
let requestAccepted = false;

requestChoices.forEach((choice, selectedIndex) => {
  choice.addEventListener("click", () => {
    requestChoices.forEach((item, index) => {
      item.setAttribute("aria-pressed", String(index === selectedIndex));
      forms[index].hidden = index !== selectedIndex;
    });
  });
});

forms.forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (requestAccepted || !form.reportValidity()) return;

    const formData = new FormData(form);
    for (const [name, value] of formData.entries()) {
      if (typeof value === "string") formData.set(name, value.trim());
    }

    const status = form.querySelector(".form-status");
    const fieldset = form.querySelector("fieldset");
    const submitButton = form.querySelector("[type=submit]");
    const submitLabel = submitButton.textContent;
    fieldset.disabled = true;
    submitButton.disabled = true;
    submitButton.textContent = "Sending request…";
    status.classList.remove("error");
    status.textContent = "Sending your request…";
    form.setAttribute("aria-busy", "true");

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" }
      });

      if (response.status !== 200) {
        let message = "Your request could not be confirmed. Please try again or email Dhunt22@ASU.edu.";
        try {
          const result = await response.json();
          const errors = Array.isArray(result.errors)
            ? result.errors.map((error) => error.message).filter(Boolean)
            : [];
          if (errors.length) message = errors.join(" ");
        } catch {
        }
        throw new Error(message);
      }

      requestAccepted = true;
      status.textContent = "Request received. Choose an available time below.";
      submitButton.textContent = "Request sent";
      requestChoices.forEach((choice) => {
        choice.disabled = true;
      });
      forms.forEach((item) => {
        item.querySelector("fieldset").disabled = true;
        item.querySelector("[type=submit]").disabled = true;
      });

      const calendarUrl = new URL(CAL_COM_URL);
      calendarUrl.searchParams.set("embed", "1");
      calendarUrl.searchParams.set("theme", "dark");
      calendar.src = calendarUrl.href;
      scheduling.hidden = false;
      document.getElementById("schedule-heading").focus();
      scheduling.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      status.classList.add("error");
      status.textContent = error instanceof TypeError
        ? "Unable to reach the request service. Check your connection and try again."
        : error.message;
    } finally {
      form.removeAttribute("aria-busy");
      if (!requestAccepted) {
        fieldset.disabled = false;
        submitButton.disabled = false;
        submitButton.textContent = submitLabel;
      }
    }
  });
});
