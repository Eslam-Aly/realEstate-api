import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

let firebaseApp;

const requiredEnvVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_STORAGE_BUCKET",
];

const missingEnvVars = () => requiredEnvVars.filter((key) => !process.env[key]);

const hasAllFirebaseEnv = () => {
  const missing = missingEnvVars();
  if (missing.length) {
    return false;
  }
  return true;
};

const normalizePrivateKey = (key) => (key ? key.replace(/\\n/g, "\n") : key);

const initFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }
  if (!hasAllFirebaseEnv()) {
    return null;
  }

  const existingApp = getApps()[0];
  if (existingApp) {
    firebaseApp = existingApp;
    return firebaseApp;
  }

  firebaseApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  // console.log("Firebase admin app initialized");
  return firebaseApp;
};

const getBucket = () => {
  const app = initFirebase();
  if (!app) {
    return null;
  }
  const bucket = getStorage(app).bucket();
  // console.log("Resolved bucket:", bucket.name);
  return bucket;
};

/**
 * Converts a Firebase download URL or gs:// URI into a bucket-relative path.
 */
export const extractStoragePath = (url) => {
  if (!url || typeof url !== "string") {
    return null;
  }

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    return null;
  }

  const trimmed = url.trim();
  if (trimmed.startsWith("gs://")) {
    const parts = trimmed.replace(/^gs:\/\//, "").split("/");
    const [targetBucket, ...segments] = parts;
    if (targetBucket !== bucketName || !segments.length) {
      return null;
    }
    const path = segments.join("/");
    return path;
  }

  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname || "";

    if (parsed.hostname === "storage.googleapis.com") {
      const [, bucket, ...pathSegments] = pathname.split("/");
      if (bucket !== bucketName || !pathSegments.length) {
        return null;
      }
      const path = pathSegments.join("/");
      return path;
    }

    if (!parsed.hostname.includes("firebasestorage.googleapis.com")) {
      return null;
    }

    const bucketMatch = pathname.match(/\/b\/([^/]+)/);
    const bucketInUrl = bucketMatch?.[1];
    if (bucketInUrl && bucketInUrl !== bucketName) {
      return null;
    }

    const objectMatch = pathname.match(/\/o\/(.+)/);
    if (!objectMatch?.[1]) {
      return null;
    }

    const decoded = decodeURIComponent(objectMatch[1]);
    return decoded;
  } catch (err) {
    return null;
  }
};

/**
 * Deletes Firebase Storage files by their download URLs/URIs.
 * Best-effort: ignores files that cannot be parsed or are already gone.
 */
export const deleteStorageFilesByUrl = async (urls = []) => {
  if (!Array.isArray(urls) || !urls.length) {
    return;
  }
  const bucket = getBucket();
  if (!bucket) {
    return;
  }

  const uniquePaths = [
    ...new Set(
      urls
        .map((url) => {
          const path = extractStoragePath(url);
          return path;
        })
        .filter((path) => typeof path === "string" && path.length)
    ),
  ];

  if (!uniquePaths.length) {
    return;
  }

  await Promise.all(
    uniquePaths.map((path) =>
      bucket
        .file(path)
        .delete({ ignoreNotFound: true })
        // .then(() => console.log("Deleted storage object", path))
        .catch(() => {})
    )
  );
};

export const isFirebaseStorageConfigured = () => Boolean(getBucket());
