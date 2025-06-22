// frontend/src/services/api.js

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/public";

export async function fetchRices() {
  const res = await fetch(`${BASE}/rices`);
  return res.json();
}

export async function fetchRice(id) {
  const res = await fetch(`${BASE}/rices/${id}`);
  return res.json();
}

export async function submitRice(data) {
  const res = await fetch(`${BASE}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

const ADMIN_TOKEN = "supersecrettoken123"; // maybe store this safely in `.env` for frontend

export async function fetchAdminSubmissions() {
  const res = await fetch(`${BASE}/admin/submissions`, {
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
  });
  return res.json();
}

export async function approveSubmission(id) {
  const res = await fetch(`${BASE}/admin/approve/${id}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
  });
  return res.ok;
}

export async function rejectSubmission(id) {
  const res = await fetch(`${BASE}/admin/reject/${id}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
  });
  return res.ok;
}

