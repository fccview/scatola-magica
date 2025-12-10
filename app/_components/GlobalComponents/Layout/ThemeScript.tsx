export default function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
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
            
            const storedPokemon = getStoredPokemonTheme();
            const storedColorMode = getStoredColorMode();
            const colorMode = storedColorMode || getSystemColorMode();
            
            applyTheme(storedPokemon, colorMode);
          })();
        `,
      }}
    />
  );
}
