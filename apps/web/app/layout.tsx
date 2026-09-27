import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'نبض تابلو | دیده‌بان بازار سرمایه',description:'تابلوخوانی، جریان پول و دیده‌بان بورس با داده مستقیم TSETMC'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="fa" dir="rtl"><body>{children}</body></html>;}
