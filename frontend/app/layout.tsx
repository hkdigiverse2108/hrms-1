import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AppLayout } from "@/components/layout/AppLayout"
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import { UserProvider } from '@/context/UserContext';
 
export const metadata: Metadata = {
  title: 'HRMS - Human Resource Management System',
  description: 'Complete HRMS solution for managing employees, attendance, payroll, and more',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}
 
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background flex min-h-screen text-foreground" suppressHydrationWarning>
        <UserProvider>
          <AntdRegistry>
            <ConfigProvider
              theme={{
                token: {
                  colorPrimary: '#09A08A',
                  borderRadius: 8,
                  colorBgContainer: '#EAF7F6', 
                },
                components: {
                  Menu: {
                    itemSelectedBg: '#09A08A',
                    itemSelectedColor: '#FFFFFF',
                    itemHoverBg: '#FFFFFF',
                    itemMarginInline: 8,
                    itemPaddingInline: 12,
                    itemMarginBlock: 4,
                    itemHeight: 30,
                  },
                },
              }}
            >
              <AppLayout>
                {children}
              </AppLayout>
            </ConfigProvider>
          </AntdRegistry>
        </UserProvider>
 
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
