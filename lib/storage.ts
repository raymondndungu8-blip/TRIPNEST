import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { app } from "./firebase"
import { docs, patchDocument } from "./db"

const storage = getStorage(app)

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `avatars/${userId}/avatar.${ext}`
  const storageRef = ref(storage, path)

  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)

  return `${url}?t=${Date.now()}`
}

export async function updateClientAvatar(
  clientId: string,
  avatarUrl: string
): Promise<void> {
  await patchDocument(docs.client(clientId), { avatarUrl })
}
