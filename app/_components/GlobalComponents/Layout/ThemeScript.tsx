export default function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            const getStoredTheme = () => {
              try {
                return localStorage.getItem('theme');
              } catch (e) {
                return null;
              }
            };
            
            const getSystemTheme = () => {
              if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
              }
              return 'light';
            };
            
            const applyTheme = (theme) => {
              const root = document.documentElement;
              const resolved = theme === 'system' ? getSystemTheme() : theme;
              root.classList.remove('light', 'dark');
              root.classList.add(resolved);
            };
            
            const stored = getStoredTheme();
            const theme = stored || 'system';
            applyTheme(theme);
          })();
        `,
      }}
    />
  );
}
