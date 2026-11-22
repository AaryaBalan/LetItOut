# Privacy and reliability update

## What changes

- `users/{uid}` is private, including existing email, phone, saved posts, and account statistics.
- `publicProfiles/{uid}` contains only public display fields. Avatar seeds must not contain an email address.
- `users/{uid}/ownedPosts/{postId}` privately records post ownership. Anonymous posts never publish the owner ID. My Center combines these records with legacy public posts.
- Chat/message access requires membership. Participants cannot be replaced. Message and conversation writes are atomic.
- Notification queries are recipient-only. Perspective events create new notifications instead of reading another person's inbox. Anonymous reflection does not send identity-revealing notifications.
- Reactions and comment supports use deterministic IDs and atomic count updates validated by the rules. A client cannot change counts without adding/removing its matching record.
- Reports are stored, and `/moderation` provides a review queue. The `moderator: true` **Firebase Auth custom claim**, assigned through a trusted Admin SDK environment, controls access. Editable user profiles cannot grant moderator privileges.
- The feed loads 20 posts at a time. The newest page stays live; older pages load as the reader scrolls. Filters apply to the posts loaded so far.

## Existing database migration

Do not deploy only the new rules while continuing to serve the old app. The old app reads private profiles, uses random reaction IDs, and writes non-atomic counters.

1. Back up Firestore and arrange a maintenance window so old clients do not write during migration.
2. Configure Application Default Credentials for the intended project in a trusted development/admin environment. Do not commit credentials.
3. Review the dry run:

   ```bash
   node scripts/migrate-privacy.mjs --project YOUR_PROJECT_ID
   ```

4. Apply only after reviewing the project ID and counts:

   ```bash
   node scripts/migrate-privacy.mjs --project YOUR_PROJECT_ID --apply
   ```

5. Deploy the reviewed rules and indexes, and release the updated app together:

   ```bash
   firebase deploy --only firestore --project YOUR_PROJECT_ID
   ```

The migration publishes allowlisted profiles, replaces email-based avatar seeds, backfills recoverable ownership, deduplicates reactions/supports, recalculates counters, and normalizes chat participant order. Old anonymous posts with no author ID cannot safely be attributed to anyone; the script reports them rather than inventing ownership. They remain moderator-manageable.

No live migration, rules deployment, moderator assignment, or production data changes are performed by the automated tests.

## Validation

```bash
npm run lint
npm run test:rules
npx expo install --check
npx expo export --platform android --output-dir /tmp/letitout-verified-export
```

The Firestore emulator requires Java 21 or later. Tests use the isolated `demo-letitout` project and exercise forbidden access as well as legitimate writes. A successful bundle export is not a substitute for device acceptance tests.

Before release, test with two ordinary accounts and a moderator: anonymous/public posting, My Center ownership, deletion, reactions, replies, chat first-send and unread badges, report submission/review, profile edits, and password changes after reauthentication.
