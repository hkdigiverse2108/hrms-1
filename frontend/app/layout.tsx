import type { Metadata } from 'next'

import './globals.css'
import { AppLayout } from "@/components/layout/AppLayout"
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, App } from 'antd';
import { UserProvider } from '@/context/UserContext';
import { ChatProvider } from '@/context/ChatContext';
import { ConfirmProvider } from '@/context/ConfirmContext';
import { Toaster } from "@/components/ui/sonner";
 
 
export const metadata: Metadata = {
  title: 'HRMS - Human Resource Management System',
  description: 'Complete HRMS solution for managing employees, attendance, payroll, and more',
  generator: 'v0.app',
  icons: {
    icon: '/hk-icon.png',
    shortcut: '/hk-icon.png',
    apple: '/hk-icon.png',
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
        {/* Temporary Debug Indicator */}
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
              <ConfirmProvider>
                <ChatProvider>
                  <App>
                    <AppLayout>
                      {children}
                    </AppLayout>
                  </App>
                </ChatProvider>
                <Toaster position="top-right" expand={true} richColors />
              </ConfirmProvider>
            </ConfigProvider>
          </AntdRegistry>
        </UserProvider>
 

      </body>
    </html>
  )
}
