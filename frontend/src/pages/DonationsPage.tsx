import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createDonation,
  deleteDonation,
  deleteDonationReceipt,
  fetchDonations,
  fetchDonationsForChurches,
  newDonationId,
  setDonationReviewStatus,
  updateDonation,
  uploadDonationReceipt,
  type Donation
} from '../lib/donations';
import { getFileUploadLabels } from '../lib/fileUploadLabels';
import type { WorkReviewStatus } from '../lib/works';
import { useAuth } from '../providers/useAuth';
import { useChurchRecordAccess } from '../providers/useChurchRecordAccess';
import { useSiteLocale } from '../providers/useSiteLocale';
import { donationsCopyByLocale } from './donations/copy';
import {
  buildDonationInput,
  donationToForm,
  initialDonationFilter,
  initialDonationForm,
  validateDonationForm,
  type DonationFormError,
  type DonationFormState
} from './donations/form';
import { DonationForm, DonationList } from './donations/DonationsSections';
import { numberLocaleBySite } from './works/copy';
import { todayDateValue } from './works/form';

export default function DonationsPage() {
  const { locale } = useSiteLocale();
  const copy = donationsCopyByLocale[locale];
  const numberLocale = numberLocaleBySite[locale];
  const uploadLabels = getFileUploadLabels(locale);
  const qc = useQueryClient();
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const { isAdmin, canRecord, loading: accessLoading, managedChurchIds, churchOptions, defaultChurchId } = useChurchRecordAccess();

  const [form, setForm] = useState<DonationFormState>(() => initialDonationForm());
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [editing, setEditing] = useState<Donation | null>(null);
  const [errors, setErrors] = useState<DonationFormError[]>([]);
  const [filter, setFilter] = useState(initialDonationFilter);
  // Remounts the file field after a save, so it does not keep showing the uploaded file.
  const [formKey, setFormKey] = useState(0);

  const donationsQuery = useQuery({
    queryKey: ['icefluDonations', isAdmin ? 'all' : managedChurchIds.join(',')],
    queryFn: () => (isAdmin ? fetchDonations() : fetchDonationsForChurches(managedChurchIds)),
    enabled: canRecord
  });

  const churchName = (id: string) => churchOptions.find(church => church.id === id)?.name ?? editing?.churchName ?? id;

  function resetForm() {
    setForm(initialDonationForm());
    setReceiptFile(null);
    setEditing(null);
    setErrors([]);
    setFormKey(key => key + 1);
  }

  const saveMutation = useMutation({
    mutationFn: async ({ values, file }: { values: DonationFormState; file: File | null }) => {
      const id = editing?.id ?? newDonationId();
      // The receipt goes up first: the record must name a file that already exists.
      const uploaded = file ? await uploadDonationReceipt(values.churchId, id, file) : null;
      const receipt = uploaded ?? (editing ? { path: editing.receiptPath, name: editing.receiptName } : null);
      if (!receipt?.path) {
        throw new Error('A receipt is required.');
      }

      const input = buildDonationInput({ form: values, churchName: churchName(values.churchId), receipt });
      try {
        if (editing) {
          await updateDonation(id, input, { uid, keepReview: isAdmin });
        } else {
          await createDonation(id, input, uid);
        }
      } catch (error) {
        if (uploaded) await deleteDonationReceipt(uploaded.path);
        throw error;
      }

      if (uploaded && editing?.receiptPath && editing.receiptPath !== uploaded.path) {
        await deleteDonationReceipt(editing.receiptPath);
      }
    },
    onSuccess: async () => {
      resetForm();
      await qc.invalidateQueries({ queryKey: ['icefluDonations'] });
    }
  });

  const reviewMutation = useMutation({
    mutationFn: ({ donation, status }: { donation: Donation; status: WorkReviewStatus }) =>
      setDonationReviewStatus(donation.id, status, uid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['icefluDonations'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (donation: Donation) => deleteDonation(donation),
    onSuccess: async (_, donation) => {
      if (editing?.id === donation.id) resetForm();
      await qc.invalidateQueries({ queryKey: ['icefluDonations'] });
    }
  });

  if (accessLoading) {
    return <p className="text-sm text-slate-500">{copy.loading}</p>;
  }

  if (!canRecord) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
        {copy.noPermission}
      </div>
    );
  }

  const values = { ...form, churchId: form.churchId || defaultChurchId };
  const busyDonation = reviewMutation.isPending
    ? reviewMutation.variables?.donation
    : deleteMutation.isPending ? deleteMutation.variables : undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{copy.title}</h1>
        <p className="text-sm text-slate-600">{isAdmin ? copy.introAdmin : copy.intro}</p>
        {isAdmin ? <p className="text-xs text-slate-500">{copy.managersHint}</p> : null}
      </div>

      <DonationForm
        key={formKey}
        copy={copy}
        uploadLabels={uploadLabels}
        form={values}
        setField={(key, value) => {
          saveMutation.reset();
          setForm(prev => ({ ...prev, churchId: values.churchId, [key]: value }));
        }}
        receiptFile={receiptFile}
        setReceiptFile={file => {
          saveMutation.reset();
          setReceiptFile(file);
        }}
        errors={errors}
        churchOptions={churchOptions}
        editing={editing}
        today={todayDateValue()}
        saving={saveMutation.isPending}
        saveError={saveMutation.isError}
        saved={saveMutation.isSuccess}
        onSubmit={() => {
          const found = validateDonationForm(values, {
            today: todayDateValue(),
            hasReceipt: !!receiptFile || !!editing?.receiptPath
          });
          setErrors(found);
          if (found.length === 0) saveMutation.mutate({ values, file: receiptFile });
        }}
        onCancel={resetForm}
      />

      {donationsQuery.isLoading ? (
        <p className="text-sm text-slate-400">{copy.loading}</p>
      ) : donationsQuery.isError ? (
        <p className="text-sm text-red-600">{copy.loadError}</p>
      ) : (
        <DonationList
          copy={copy}
          numberLocale={numberLocale}
          donations={donationsQuery.data ?? []}
          filter={filter}
          setFilter={setFilter}
          churchOptions={churchOptions.length > 1 ? churchOptions : []}
          isAdmin={isAdmin}
          busyId={busyDonation?.id ?? null}
          actionError={reviewMutation.isError || deleteMutation.isError}
          onEdit={donation => {
            if (!isAdmin && donation.reviewStatus === 'reviewed' && !window.confirm(copy.confirmEditReviewed)) return;
            saveMutation.reset();
            setEditing(donation);
            setForm(donationToForm(donation));
            setReceiptFile(null);
            setErrors([]);
            setFormKey(key => key + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onDelete={donation => {
            if (window.confirm(copy.confirmDelete)) deleteMutation.mutate(donation);
          }}
          onReview={(donation, status) => reviewMutation.mutate({ donation, status })}
        />
      )}
    </div>
  );
}
