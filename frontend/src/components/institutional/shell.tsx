/**
 * r352 — the institutional workspace shell: the rail nav + masthead
 * every /institution route renders inside the platform's AppShell
 * (the global shell is untouched — this only composes content inside
 * it).
 *
 * Gating:
 *  · Sections render per the module registry (kind-relevant rows).
 *  · WRITE controls inside modules read the server's effective
 *    capability set (useMyCapabilities) — never client-side labels.
 *  · A deep-link to a kind-hidden module renders the honest
 *    explanation (ModuleHiddenState), not a silent redirect.
 */
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useMyInstitutionProfile } from '../../hooks/institutional/queries';
import { moduleHiddenReason, visibleModules } from './modules';
import { INSTITUTION_STATUS_LABELS, SECTOR_LABELS } from '../../lib/institutional/labels';
import { EnumChip, ModuleHiddenState } from './kit';
import { Icon } from '../Icon';
import { Skeleton } from '../primitives/States';
import { ROUTES } from '../../lib/routes';

export function InstitutionWorkspaceLayout() {
  const profileQuery = useMyInstitutionProfile();
  const location = useLocation();

  const profile = profileQuery.data ?? null;
  const sections = useMemo(() => visibleModules(profile), [profile]);
  const hiddenReason = moduleHiddenReason(location.pathname, profile);

  const institution = profileQuery.data ?? null;
  const masthead = (
    <div className="inst-masthead">
      {institution ? (
        <>
          <span className="inst-masthead-kind">
            {institution.kind
              ? institution.kind.nameAr
              : 'المؤسسة التعليمية'}
          </span>
          {institution.sector && (
            <span className="inst-masthead-kind">· {SECTOR_LABELS[institution.sector]}</span>
          )}
          <EnumChip value={institution.status} labels={INSTITUTION_STATUS_LABELS} />
        </>
      ) : profileQuery.isLoading ? (
        <Skeleton width={220} height={20} />
      ) : null}
    </div>
  );

  return (
    <div className="inst-layout">
      <nav className="inst-rail" aria-label="أقسام مساحة العمل المؤسسية">
        {sections.map((m) => (
          <NavLink key={m.to} to={m.to} end={m.to === ROUTES.institutionRoot}>
            <Icon icon={m.icon} size={16} />
            {m.label}
          </NavLink>
        ))}
      </nav>
      <div>
        {masthead}
        {hiddenReason ? (
          <ModuleHiddenState reason={hiddenReason} />
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}
