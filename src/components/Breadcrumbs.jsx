import { Link, useLocation } from "react-router-dom";
import { buildBreadcrumbs } from "@/lib/navigation";

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const breadcrumbs = buildBreadcrumbs(pathname);

  if (!breadcrumbs.length || pathname === "/home" || pathname === "/") {
    return null;
  }

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 text-sm">
        <nav className="flex items-center gap-2 text-slate-600">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div key={`${item.path}-${item.label}`} className="flex items-center gap-2 min-w-0">
                {isLast ? (
                  <span className="text-slate-900 font-medium truncate">{item.label}</span>
                ) : (
                  <Link to={item.path} className="hover:text-emerald-700 transition-colors truncate">
                    {item.label}
                  </Link>
                )}
                {!isLast && <span className="text-slate-400">/</span>}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
