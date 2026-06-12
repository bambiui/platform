# bambiui Platform Agent Rules

## Design System Token Rule

Users must be able to build their own design systems by manipulating every public bambiui design token.

- All visual styling must be expressed through CSS custom properties using the `--bambi-*` namespace.
- Preserve the token layering model: primitive -> semantic -> intent/state -> component.
- Components must expose both global/base tokens and component-specific tokens where customization is meaningful.
- Do not hardcode colors, spacing, radii, typography, shadows, or state styles inside component CSS when a token can represent the value.
- Component-specific tokens should derive from semantic or intent tokens by default, so global theme changes cascade predictably.
- New components must document or otherwise make discoverable their public component-specific tokens.
- Generated framework wrappers must not introduce styling behavior that bypasses tokens.
- Public registry artifacts must include the CSS/token files required for end users to override the full design system after install.

## Studio Token Editing Contract

Studio must support editing the full public token surface:

- Users can edit base/global tokens such as colors, spacing, radii, typography, shadows, semantic colors, intent tokens, and state tokens.
- Users can edit component-specific tokens independently from global tokens.
- Component-specific edits should override defaults without breaking inheritance from global tokens when no override is set.
- Studio import/export must preserve both global token overrides and component-specific token overrides.
- Studio previews must reflect token changes live for the selected theme/scheme.
- Adding a new public token in `platform` should be paired with Studio metadata support so it is discoverable and editable.
