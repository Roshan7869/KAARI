
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
    process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false }
});

async function main() {
    const users = [
        { email: "test.user@kaari.in", password: "Audit@2024!", role: "customer" },
        { email: "admin@kaari.in", password: "Admin@2024!", role: "admin" }
    ];

    for (const u of users) {
        console.log(`Checking user: ${u.email}`);
        const { data: { users: existingUsers }, error: listError } = await sb.auth.admin.listUsers();
        if (listError) {
            console.error(`Error listing users: ${listError.message}`);
            continue;
        }

        const existing = existingUsers.find(ex => ex.email === u.email);
        let userId;

        if (existing) {
            console.log(`User ${u.email} already exists. Updating password...`);
            const { data: updated, error: updateError } = await sb.auth.admin.updateUserById(existing.id, {
                password: u.password,
                email_confirm: true
            });
            if (updateError) console.error(`Error updating user: ${updateError.message}`);
            userId = existing.id;
        } else {
            console.log(`Creating user ${u.email}...`);
            const { data: { user }, error: createError } = await sb.auth.admin.createUser({
                email: u.email,
                password: u.password,
                email_confirm: true,
                user_metadata: { full_name: u.role === 'admin' ? 'Admin User' : 'Test User' }
            });
            if (createError) {
                console.error(`Error creating user: ${createError.message}`);
                continue;
            }
            userId = user.id;
        }

        if (userId) {
            console.log(`Setting role to ${u.role} for ${u.email} (ID: ${userId})`);
            // The trigger handle_new_user should automatically create the profile and role as 'customer'
            // We need to upsert the admin role explicitly in user_roles
            const { error: roleError } = await sb
                .from('user_roles')
                .upsert({ user_id: userId, role: u.role }, { onConflict: 'user_id,role' });
            
            if (roleError) console.error(`Error setting role: ${roleError.message}`);
        }
    }
    console.log("Seeding complete.");
}

main();
