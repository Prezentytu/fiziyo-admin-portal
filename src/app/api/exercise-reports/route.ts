import { NextRequest, NextResponse } from "next/server";

/**
 * API Route do wysyłania raportów o błędach w ćwiczeniach na Discord
 * Dedykowany kanał dla zespołu content do naprawy ćwiczeń
 */

const DISCORD_WEBHOOK_URL = process.env.DISCORD_EXERCISE_REPORTS_WEBHOOK_URL;
const ADMIN_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://admin.fiziyo.com";

interface ExerciseInfo {
  id: string;
  name: string;
  exerciseId?: string; // ID ćwiczenia (nie mappingu)
}

interface PatientInfo {
  id: string;
  name: string;
}

interface ExerciseReportRequest {
  message: string;
  exerciseSet: {
    id: string;
    name: string;
    exercises: ExerciseInfo[];
  };
  patients: PatientInfo[];
  reporter: {
    userId: string;
    email: string;
    name?: string;
  };
  organizationId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExerciseReportRequest = await request.json();

    if (!body.message?.trim()) {
      return NextResponse.json(
        { success: false, message: "Treść zgłoszenia jest wymagana" },
        { status: 400 }
      );
    }

    if (!DISCORD_WEBHOOK_URL) {
      console.error("[API/exercise-reports] No Discord webhook URL configured");
      return NextResponse.json(
        { success: false, message: "Webhook nie jest skonfigurowany" },
        { status: 503 }
      );
    }

    const embed = buildDiscordEmbed(body);
    const discordPayload = {
      username: "FiziYo Exercise Reports",
      avatar_url: "https://i.imgur.com/AfFp7pu.png",
      embeds: [embed],
    };

    const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload),
    });

    if (discordResponse.ok) {
      return NextResponse.json({
        success: true,
        message: "Zgłoszenie wysłane pomyślnie",
      });
    }

    const errorText = await discordResponse.text();
    console.error("[API/exercise-reports] Discord error:", discordResponse.status, errorText);
    return NextResponse.json(
      { success: false, message: `Błąd Discord: ${discordResponse.status}` },
      { status: 500 }
    );
  } catch (error) {
    console.error("[API/exercise-reports] Error:", error);
    return NextResponse.json(
      { success: false, message: "Wystąpił błąd podczas wysyłania zgłoszenia" },
      { status: 500 }
    );
  }
}

function buildDiscordEmbed(report: ExerciseReportRequest) {
  const setUrl = `${ADMIN_BASE_URL}/exercise-sets/${report.exerciseSet.id}`;
  
  // Lista ćwiczeń z linkami do edycji
  const exercisesList = report.exerciseSet.exercises
    .map((ex, i) => {
      const exerciseUrl = `${ADMIN_BASE_URL}/exercises/${ex.exerciseId || ex.id}`;
      return `${i + 1}. **${ex.name}**\n   └ ID: \`${ex.exerciseId || ex.id}\` • [Edytuj](${exerciseUrl})`;
    })
    .join("\n");

  // Lista pacjentów
  const patientsList = report.patients
    .map((p) => `• ${p.name} (\`${p.id}\`)`)
    .join("\n");

  const fields = [
    {
      name: "📝 Treść zgłoszenia",
      value: sanitizeText(report.message),
      inline: false,
    },
    {
      name: "📋 Zestaw ćwiczeń",
      value: `**${report.exerciseSet.name}**\nID: \`${report.exerciseSet.id}\`\n[🔗 Otwórz w adminie](${setUrl})`,
      inline: false,
    },
    {
      name: `🏋️ Ćwiczenia w zestawie (${report.exerciseSet.exercises.length})`,
      value: exercisesList || "Brak ćwiczeń",
      inline: false,
    },
    {
      name: `👤 Pacjenci (${report.patients.length})`,
      value: patientsList || "Brak pacjentów",
      inline: true,
    },
    {
      name: "👨‍⚕️ Zgłaszający",
      value: `${report.reporter.name || "Terapeuta"}\n${report.reporter.email}\nUser ID: \`${report.reporter.userId}\``,
      inline: true,
    },
    {
      name: "🏢 Organizacja",
      value: `\`${report.organizationId}\``,
      inline: true,
    },
  ];

  return {
    title: "🚨 Raport błędu w ćwiczeniach",
    description: `Terapeuta zgłosił problem z zestawem ćwiczeń.\n\n**Instrukcja obsługi:** Sprawdź ćwiczenia z listy poniżej, napraw błędy (zdjęcie/opis) i oznacz reakcją ✅`,
    color: 0xff6b35, // Pomarańczowy
    fields,
    footer: {
      text: "FiziYo Exercise Reports • Kliknij linki aby edytować",
    },
    timestamp: new Date().toISOString(),
  };
}

function sanitizeText(text: string): string {
  if (!text) return "Brak treści";
  return text
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("@everyone", "@\u200beveryone")
    .replaceAll("@here", "@\u200bhere")
    .substring(0, 1000);
}
