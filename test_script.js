/**
 * @wm_summary Minimal Test Script
 * @wm_description A simple hello world script.
 * @wm_tags ["test"]
 * @wm_path u/admin/test_script
 */
export async function main(name = "World") {
    return { message: `Hello, ${name}!` };
}
