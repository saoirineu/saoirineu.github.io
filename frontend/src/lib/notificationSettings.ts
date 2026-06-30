import { Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from './firebase';
import { asRecord, asStringArray } from './firestoreData';

/**
 * Recipients of the admin "new ICEFLU registration pending" notice, managed from
 * the /admin/users panel. The Cloud Function always also sends to the baseline
 * emails below; this config only adds to them.
 */
export type NotificationSettings = {
  recipientUserIds: string[];
  extraEmails: string[];
};

/** Always-on recipients, mirrored from functions/src/index.ts BASELINE_NOTIFY. */
export const BASELINE_NOTIFY_EMAILS = ['renato@junto.space', 'international.secretariat@stellazzurra.org'];

const notificationsDoc = doc(db, 'settings', 'notifications');

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const snap = await getDoc(notificationsDoc);
  const data = asRecord(snap.data());
  return {
    recipientUserIds: asStringArray(data.recipientUserIds) ?? [],
    extraEmails: asStringArray(data.extraEmails) ?? []
  };
}

export async function updateNotificationSettings(settings: NotificationSettings): Promise<void> {
  await setDoc(
    notificationsDoc,
    {
      recipientUserIds: settings.recipientUserIds,
      extraEmails: settings.extraEmails,
      updatedAt: Timestamp.now()
    },
    { merge: true }
  );
}
