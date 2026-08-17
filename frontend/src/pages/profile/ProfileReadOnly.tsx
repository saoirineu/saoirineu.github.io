import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { UserDocumentLink } from '../../components/UserDocumentLink';
import type { ProfileLocale } from '../../lib/profileCatalog';
import type { UserProfile } from '../../lib/users';
import { fetchChurches } from '../../lib/works';
import { profileCopyByLocale, profileSectionsCopy } from './copy';
import { buildProfileFormFromProfile, type ProfileFormFieldSetter } from './form';
import {
  ProfileChurchesSection,
  ProfileConsentsSection,
  ProfileIdentitySection,
  ProfileInitiationSection,
  ProfileNationalityDeclaration,
  ProfileNotesSection,
  ProfilePersonalSection,
  ProfileResidenceSection,
  ProfileRolesSection
} from './ProfileSections';

/**
 * The ICEFLU membership form of somebody else, rendered exactly as they filled
 * it in but with every control locked. An administrator reviewing an
 * application sees the whole submission — same sections, same order, same
 * labels, Italian or non-Italian variant — instead of a hand-picked summary
 * that has to be extended every time the form gains a field.
 */

/**
 * A disabled form usually means "you cannot type here"; here it means "this is
 * what the applicant wrote", so the values are restyled to read as text rather
 * than as unavailable fields. Written as descendant variants so ProfileSections
 * stays one plain editable form, with no read-only mode threaded through every
 * input.
 */
const readOnlyFieldClasses = [
  '[&_label]:text-slate-700',
  '[&_input:disabled]:text-slate-900',
  '[&_select:disabled]:text-slate-900',
  '[&_textarea:disabled]:text-slate-900'
].join(' ');

const ignoreFieldChange: ProfileFormFieldSetter = () => undefined;
const ignoreChurchCreation = () => undefined;

export function ProfileReadOnly({
  profile,
  locale,
  noDocumentLabel
}: {
  profile: UserProfile;
  locale: ProfileLocale;
  noDocumentLabel: string;
}) {
  const churchesQuery = useQuery({ queryKey: ['churches'], queryFn: fetchChurches });
  const copy = profileSectionsCopy(locale);
  const documentsTitle = profileCopyByLocale[locale].idUploadTitle;
  const form = useMemo(() => buildProfileFormFromProfile(profile), [profile]);

  return (
    <fieldset disabled className={`m-0 min-w-0 space-y-4 border-0 p-0 ${readOnlyFieldClasses}`}>
      <ProfileNationalityDeclaration copy={copy} form={form} setField={ignoreFieldChange} />

      <ProfilePersonalSection
        avatarUrl={form.avatarUrl}
        copy={copy}
        form={form}
        setField={ignoreFieldChange}
        userPhotoURL={null}
      />

      <ProfileIdentitySection copy={copy} form={form} locale={locale} setField={ignoreFieldChange} />

      <ProfileResidenceSection copy={copy} form={form} locale={locale} setField={ignoreFieldChange} />

      {/* Where the applicant uploads their ID; for the reviewer, where they open it. */}
      <section className="space-y-3 rounded-lg bg-slate-100 p-3">
        <h2 className="text-sm font-semibold text-slate-900">{documentsTitle}</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="space-y-1">
            <span className="block font-medium text-slate-600">{copy.identityDocumentPrimary}</span>
            <UserDocumentLink
              name={profile.identityDocumentPrimaryName}
              path={profile.identityDocumentPrimaryPath}
              fallback={noDocumentLabel}
            />
          </div>
          <div className="space-y-1">
            <span className="block font-medium text-slate-600">{copy.identityDocumentSecondary}</span>
            <UserDocumentLink
              name={profile.identityDocumentSecondaryName}
              path={profile.identityDocumentSecondaryPath}
              fallback={noDocumentLabel}
            />
          </div>
        </div>
      </section>

      <ProfileConsentsSection copy={copy} form={form} setField={ignoreFieldChange} />

      <ProfileNotesSection copy={copy} form={form} setField={ignoreFieldChange} />

      <ProfileChurchesSection
        copy={copy}
        form={form}
        churches={churchesQuery.data}
        onRequestCreateChurch={ignoreChurchCreation}
        setField={ignoreFieldChange}
      />

      <ProfileInitiationSection
        copy={copy}
        form={form}
        churches={churchesQuery.data}
        onRequestCreateChurch={ignoreChurchCreation}
        setField={ignoreFieldChange}
      />

      <ProfileRolesSection copy={copy} form={form} setField={ignoreFieldChange} />
    </fieldset>
  );
}
