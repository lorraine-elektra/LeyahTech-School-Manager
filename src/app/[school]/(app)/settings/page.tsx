import { allow } from '@/features/auth/permissions';
import { requireViewer } from '@/features/auth/session';
import { termLabel } from '@/features/school/calendar';
import { accentColors } from '@/features/settings/accents';
import { setCurrentTerm, updateSchoolProfile } from '@/features/settings/actions';
import { ActionForm } from '@/ui/ActionForm';
import { PageHeader } from '@/ui/PageHeader';
import { Section } from '@/ui/Section';
import { formatDate } from '@/ui/format';

export default async function SettingsPage({ params }: { params: Promise<{ school: string }> }) {
  const { school: slug } = await params;
  const viewer = await requireViewer(slug);
  allow(viewer.role === 'headteacher');
  const { school } = viewer;

  return (
    <>
      <PageHeader title="Settings" meta={`School code ${school.slug}`} />
      <div className="grid-2">
        <Section title="School profile" icon="settings">
          <ActionForm action={updateSchoolProfile.bind(null, slug)} submitLabel="Save profile">
            <div className="form-grid">
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>School name</span>
                <input name="name" defaultValue={school.name} required />
              </label>
              <label className="field">
                <span>Short name</span>
                <input name="shortName" defaultValue={school.shortName} maxLength={12} required />
                <span className="field__hint">Shown on receipts and the crest</span>
              </label>
              <label className="field">
                <span>Phone</span>
                <input name="phone" defaultValue={school.phone} className="mono" inputMode="tel" required />
              </label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Address</span>
                <input name="address" defaultValue={school.address} required />
              </label>
              <label className="field" style={{ gridColumn: '1 / -1' }}>
                <span>Email</span>
                <input name="email" type="email" defaultValue={school.email} required />
              </label>
            </div>
            <fieldset className="field" style={{ marginTop: 16, border: 0, padding: 0 }}>
              <span>School colour</span>
              <div className="swatches">
                {accentColors.map((color) => (
                  <label key={color.value} title={color.label}>
                    <input type="radio" name="accentColor" value={color.value} defaultChecked={color.value === school.accentColor} />
                    <span style={{ background: color.value }} />
                  </label>
                ))}
              </div>
              <span className="field__hint">Used for the sidebar, buttons and report cards</span>
            </fieldset>
          </ActionForm>
        </Section>
        <div>
          <Section title="Current term" icon="schedule">
            <ActionForm action={setCurrentTerm.bind(null, slug)} submitLabel="Set current term">
              <label className="field">
                <span>Term</span>
                <select name="termId" defaultValue={viewer.currentTerm.id}>
                  {[...viewer.terms].reverse().map((term) => (
                    <option key={term.id} value={term.id}>
                      {termLabel(term)}
                    </option>
                  ))}
                </select>
                <span className="field__hint">Registers, score sheets and fee accounts open on this term for every user.</span>
              </label>
            </ActionForm>
          </Section>
          <Section title="Terms" icon="time">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Term</th>
                    <th>Starts</th>
                    <th>Ends</th>
                  </tr>
                </thead>
                <tbody>
                  {[...viewer.terms].reverse().map((term) => (
                    <tr key={term.id}>
                      <td>
                        {termLabel(term)} {term.id === viewer.currentTerm.id && <span className="tag tag--good">Current</span>}
                      </td>
                      <td className="nowrap">{formatDate(term.startsOn)}</td>
                      <td className="nowrap">{formatDate(term.endsOn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
