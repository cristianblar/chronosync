import Link from "next/link";
import LogoutButton from "@/components/settings/LogoutButton";

const SETTINGS_SECTIONS = [
  {
    group: "Cuenta",
    items: [
      { href: "/settings/profile", icon: "👤", label: "Perfil", description: "Nombre, zona horaria, idioma" },
      { href: "/settings/notifications", icon: "🔔", label: "Notificaciones", description: "Recordatorios y alertas" },
      { href: "/settings/integrations", icon: "🔗", label: "Integraciones", description: "Google Calendar" },
    ],
  },
  {
    group: "Privacidad",
    items: [
      { href: "/settings/data", icon: "🔒", label: "Mis datos", description: "Exportar y eliminar cuenta" },
      { href: "/privacy", icon: "📄", label: "Política de privacidad", description: "" },
      { href: "/terms", icon: "📋", label: "Términos del servicio", description: "" },
    ],
  },
  {
    group: "Aplicación",
    items: [
      { href: "/settings/about", icon: "ℹ️", label: "Acerca de", description: "Versión y aviso médico" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="mobile-container space-y-6">
      <h1 className="text-xl font-bold text-foreground pt-2">Ajustes</h1>

      {SETTINGS_SECTIONS.map((section) => (
        <div key={section.group}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{section.group}</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            {section.items.map((item, idx) => (
              <Link
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition"
                href={item.href}
                key={item.href}
                style={{ borderTop: idx > 0 ? "1px solid var(--border)" : "none" }}
              >
                <span className="text-xl w-8 text-center">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  {item.description && (
                    <p className="text-xs text-muted">{item.description}</p>
                  )}
                </div>
                <span className="text-muted text-sm">›</span>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <LogoutButton />
    </div>
  );
}
