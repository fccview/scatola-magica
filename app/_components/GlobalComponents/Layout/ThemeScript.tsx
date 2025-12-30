export default function ThemeScript({
  persistentTheme = false,
  userPokemonTheme,
  userColorMode,
}: {
  persistentTheme?: boolean;
  userPokemonTheme?: string | null;
  userColorMode?: "light" | "dark";
}) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            const persistentTheme = ${JSON.stringify(persistentTheme)};
            const userPokemonTheme = ${JSON.stringify(userPokemonTheme)};
            const userColorMode = ${JSON.stringify(userColorMode)};

            const getStoredPokemonTheme = () => {
              try {
                const stored = localStorage.getItem('pokemonTheme');
                return stored || null;
              } catch (e) {
                return null;
              }
            };

            const getStoredColorMode = () => {
              try {
                return localStorage.getItem('colorMode');
              } catch (e) {
                return null;
              }
            };

            const getSystemColorMode = () => {
              if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
              }
              return 'light';
            };

            const applyTheme = (pokemonTheme, colorMode) => {
              const root = document.documentElement;
              const validPokemon = ['pikachu', 'bulbasaur', 'charmander', 'squirtle', 'gengar'];
              const validColorModes = ['light', 'dark'];

              root.classList.remove(...validPokemon, ...validColorModes);

              root.classList.add(colorMode);
              if (pokemonTheme && validPokemon.includes(pokemonTheme)) {
                root.classList.add(pokemonTheme);
              }
            };

            let pokemonTheme;
            let colorMode;

            if (persistentTheme && (userPokemonTheme !== undefined || userColorMode !== undefined)) {
              pokemonTheme = userPokemonTheme;
              colorMode = userColorMode || getSystemColorMode();
            } else {
              pokemonTheme = getStoredPokemonTheme();
              colorMode = getStoredColorMode() || getSystemColorMode();
            }

            applyTheme(pokemonTheme, colorMode);
          })();
        `,
      }}
    />
  );
}
