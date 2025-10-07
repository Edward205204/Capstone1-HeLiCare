import AddressJson from '~/constants/address_json'
import { ContactJson } from '~/constants/contact_json'

export interface InstitutionUpdateData {
  institution_id: string
  name: string
  address: AddressJson
  contact_info: ContactJson
}
