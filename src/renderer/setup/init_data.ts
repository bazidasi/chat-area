import { defaultSessionsForCN, defaultSessionsForEN } from '@/packages/initial_data'

/**
 * Historically this seeded demo/template sessions ("Just chat", "Markdown 101
 * (Example)", image-creator demo, …) into a fresh install, so the sidebar was
 * pre-populated with sample chats the user never asked for. Fibonacci now
 * ships with a clean session list — no chats are displayed by default.
 *
 * The function is kept as a no-op (and the seed arrays are still imported so
 * the demo-id inventory stays discoverable for `migrate_16_to_17`) because the
 * migration pipeline still calls it on first launch; `migrate_16_to_17`
 * removes the demo sessions that older versions had already seeded.
 */
export async function initData() {
  void defaultSessionsForCN
  void defaultSessionsForEN
}
