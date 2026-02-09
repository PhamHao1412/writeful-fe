import {type ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function AuthGuard({ children }: { children: ReactNode }) {
    const nav = useNavigate();

    useEffect(() => {
        // Guard “nhẹ”: nếu BE trả 401 ở page nào thì page đó sẽ redirect
        // (Mình xử lý cụ thể ở API call trong từng page)
    }, [nav]);

    return <>{children}</>;
}
