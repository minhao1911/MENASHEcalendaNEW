/**
 * Lightweight in-memory Census store.
 *
 * Written to by family-head and family-members screens.
 * Read by review screen.
 * Cleared on submit.
 *
 * No AsyncStorage. No API. Pure module-level singleton.
 */

export type AliyahStatus = "in_israel" | "awaiting" | "unknown";
export type MaritalStatus = "single" | "married" | "divorced" | "widowed" | "";
export type Sex = "M" | "F" | "";
export type Relation = "spouse" | "child" | "parent" | "sibling" | "other" | "";

export interface CensusHeadData {
  surname:               string;
  namePerPassport:       string;
  hebrewName:            string;
  sex:                   Sex;
  maritalStatus:         MaritalStatus;
  dob:                   string;
  fatherName:            string;
  motherName:            string;
  dateOfJudaismPractice: string;
  passportNo:            string;
  passportIssueDate:     string;
  passportExpiryDate:    string;
  aliyahStatus:          AliyahStatus;
}

export interface CensusMemberData {
  id:              string;
  relation:        Relation;
  surname:         string;
  namePerPassport: string;
  hebrewName:      string;
  sex:             Sex;
  maritalStatus:   MaritalStatus;
  dob:             string;
  aliyahStatus:    AliyahStatus;
}

interface CensusStore {
  head:    CensusHeadData | null;
  members: CensusMemberData[];
}

const _store: CensusStore = {
  head:    null,
  members: [],
};

export function setHead(data: CensusHeadData)         { _store.head    = data; }
export function setMembers(data: CensusMemberData[])  { _store.members = data; }
export function getHead()    { return _store.head;    }
export function getMembers() { return _store.members; }
export function clearCensus() { _store.head = null; _store.members = []; }
