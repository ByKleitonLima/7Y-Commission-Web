"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import {
    onIdTokenChanged,
    signInWithEmailAndPassword,
    signOut,
    User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";

interface AuthContextType {
    user: User | null;
    name: string | null;
    role: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SESSION_COOKIE = "7y_session";

function setSessionCookie(token: string | null) {
    if (typeof document === "undefined") return;

    if (token) {
        document.cookie = `${SESSION_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24 * 7
            }; SameSite=Lax`;
    } else {
        document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [name, setName] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                const token = await firebaseUser.getIdToken();
                setSessionCookie(token);

                try {
                    const snapshot = await getDoc(doc(db, "users", firebaseUser.uid));
                    const data = snapshot.exists() ? snapshot.data() : null;
                    setName(data?.name ?? firebaseUser.email?.split("@")[0] ?? "Usuário");
                    setRole(data?.role ?? "Usuário");
                } catch {
                    setName(firebaseUser.email?.split("@")[0] ?? "Usuário");
                    setRole("Usuário");
                }
            } else {
                setSessionCookie(null);
                setName(null);
                setRole(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    async function login(email: string, password: string) {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const token = await credential.user.getIdToken();
        setSessionCookie(token);
    }

    async function logout() {
        await signOut(auth);
        setSessionCookie(null);
        router.push("/");
    }

    return (
        <AuthContext.Provider value={{ user, name, role, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth precisa ser usado dentro de um <AuthProvider>");
    }
    return context;
}