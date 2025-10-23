import AddressJson from '~/models/address_json'
import { ContactJson } from '~/models/contact_json'

export interface InstitutionUpdateData {
  institution_id: string
  name: string
  address: AddressJson
  contact_info: ContactJson
}
