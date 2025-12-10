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
              const validThemes = ['light', 'dark', 'pikachu', 'bulbasaur', 'charmander', 'squirtle', 'gengar'];
              root.classList.remove(...validThemes);
              if (validThemes.includes(theme)) {
                root.classList.add(theme);
              } else {
                root.classList.add('light');
              }
            };
            
            const stored = getStoredTheme();
            const theme = stored || getSystemTheme();
            applyTheme(theme);
          })();
        `,
      }}
    />
  );
}
