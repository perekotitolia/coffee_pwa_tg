import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const sb = createClient(url, key)

async function main() {
  const deviceId = 'demo-device'
  const { data: existing } = await sb.from('profiles').select('*').eq('device_id', deviceId).maybeSingle()
  if (!existing) {
    await sb.from('profiles').insert({ device_id: deviceId, points: 0 })
    console.log('Seeded profile:', deviceId)
  } else {
    console.log('Profile exists:', deviceId)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})