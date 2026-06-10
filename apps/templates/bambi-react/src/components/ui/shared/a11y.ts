export interface A11yMetadata {
  roles?: Record<string, string>;
  keyboard?: readonly string[];
  relationships?: Record<string, string>;
  description?: string;
}
