{
  description = "BlocksCAD development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            nodePackages.jshint
            openscad  # For testing generated OpenSCAD code
          ];

          shellHook = ''
            echo "BlocksCAD development environment"
            echo "Available tools: node, npm, jshint, openscad"
            echo ""
            echo "Run 'npm install' if node_modules is missing"
            echo "Run 'npm run lint' to lint the codebase"
          '';
        };
      }
    );
}
