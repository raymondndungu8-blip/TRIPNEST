import { getFirestore, type Firestore } from "firebase/firestore"
import { app } from "./firebase"

export const db = (app ? getFirestore(app) : null) as Firestore
