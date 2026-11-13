"use client";
import { openDB, type IDBPDatabase } from "idb";
import type { Recording, Session, CalibrationProfile } from "./types";

const DB_NAME = "voice-trainer";
const DB_VERSION = 1;

let _db: IDBPDatabase | null = null;

async function getDB() {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("recordings")) {
        const recStore = db.createObjectStore("recordings", { keyPath: "id" });
        recStore.createIndex("createdAt", "createdAt");
        recStore.createIndex("techniqueId", "techniqueId");
      }
      if (!db.objectStoreNames.contains("sessions")) {
        const sessStore = db.createObjectStore("sessions", { keyPath: "id" });
        sessStore.createIndex("startedAt", "startedAt");
      }
      if (!db.objectStoreNames.contains("profiles")) {
        db.createObjectStore("profiles", { keyPath: "id" });
      }
    },
  });
  return _db;
}

// ─── Recordings ───────────────────────────────────────────────────────────────

export async function saveRecording(rec: Recording): Promise<void> {
  const db = await getDB();
  await db.put("recordings", rec);
}

export async function getRecordings(): Promise<Recording[]> {
  const db = await getDB();
  return db.getAllFromIndex("recordings", "createdAt");
}

export async function getRecording(id: string): Promise<Recording | undefined> {
  const db = await getDB();
  return db.get("recordings", id);
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("recordings", id);
}

export async function deleteAllRecordings(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("recordings", "readwrite");
  await tx.store.clear();
  await tx.done;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function saveSession(session: Session): Promise<void> {
  const db = await getDB();
  await db.put("sessions", session);
}

export async function getSessions(): Promise<Session[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("sessions", "startedAt");
  return all.reverse();
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await getDB();
  return db.get("sessions", id);
}

// ─── Calibration profiles ─────────────────────────────────────────────────────

export async function saveProfile(profile: CalibrationProfile): Promise<void> {
  const db = await getDB();
  await db.put("profiles", profile);
}

export async function getProfiles(): Promise<CalibrationProfile[]> {
  const db = await getDB();
  return db.getAll("profiles");
}

export async function getProfile(id: string): Promise<CalibrationProfile | undefined> {
  const db = await getDB();
  return db.get("profiles", id);
}

export async function deleteProfile(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("profiles", id);
}
