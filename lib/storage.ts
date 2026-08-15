import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { app } from "./firebase"
import { docs, patchDocument } from "./db"

const storage = app ? getStorage(app) : null

/** Upload a browser File/Blob under a folder and return a cache-busted URL. */
export async function uploadFile(folder: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  if (!storage) throw new Error("Firebase Storage is not configured")
  const storageRef = ref(storage, path)

  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)

  return `${url}?t=${Date.now()}`
}

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  return uploadFile(`avatars/${userId}`, file)
}

export async function uploadDriverAvatar(
  userId: string,
  file: File
): Promise<string> {
  return uploadFile(`drivers/${userId}/avatar`, file)
}

export async function uploadVehicleImage(
  userId: string,
  file: File
): Promise<string> {
  return uploadFile(`drivers/${userId}/vehicle`, file)
}

export async function uploadLicenseFront(
  userId: string,
  file: File
): Promise<string> {
  return uploadFile(`drivers/${userId}/licence-front`, file)
}

export async function uploadLicenseBack(
  userId: string,
  file: File
): Promise<string> {
  return uploadFile(`drivers/${userId}/licence-back`, file)
}

export async function uploadNationalId(
  userId: string,
  file: File
): Promise<string> {
  return uploadFile(`drivers/${userId}/national-id`, file)
}

export async function updateClientAvatar(
  clientId: string,
  avatarUrl: string
): Promise<void> {
  await patchDocument(docs.client(clientId), { avatarUrl })
}
