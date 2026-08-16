import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_PERMISSIONS = [
  "enregistrer_vente",
  "voir_stocks",
  "gerer_stock",
  "annuler_vente",
  "voir_rapports",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Authentification requise" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: callerData, error: callerError } = await supabaseAuth.auth.getUser(token);
    if (callerError || !callerData.user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", callerData.user.id)
      .maybeSingle();

    if (callerProfileError || !callerProfile || callerProfile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Action réservée aux administrateurs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, fullName, role, permissions } = await req.json();

    if (typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Adresse e-mail invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof password !== "string" || password.length < 6) {
      return new Response(JSON.stringify({ error: "Le mot de passe doit contenir au moins 6 caractères" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof fullName !== "string" || fullName.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Le nom complet est requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (role !== "admin" && role !== "employee") {
      return new Response(JSON.stringify({ error: "Rôle invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safePermissions = Array.isArray(permissions)
      ? permissions.filter((p: unknown) => typeof p === "string" && ALLOWED_PERMISSIONS.includes(p))
      : [];

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created.user) {
      const message = createError?.message?.includes("already been registered")
        ? "Cet e-mail est déjà utilisé"
        : "Impossible de créer ce compte";
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      email,
      full_name: fullName.trim(),
      role,
      permissions: role === "admin" ? [] : safePermissions,
      is_active: true,
      created_by: callerData.user.id,
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-employee failed", error);
    return new Response(JSON.stringify({ error: "Une erreur est survenue, veuillez réessayer" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
