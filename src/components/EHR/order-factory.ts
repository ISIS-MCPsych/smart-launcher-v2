import type { fhirclient } from "fhirclient/lib/types.d"

// LOINC codes for common tests
const testCodes: Record<string, { system: string; code: string; display: string }> = {
  "Blood Test": {
    system: "http://loinc.org",
    code: "33747-0",
    display: "General blood panel"
  },
  "X-Ray": {
    system: "http://loinc.org", 
    code: "36643-5",
    display: "X-ray study"
  },
  "MRI Scan": {
    system: "http://loinc.org",
    code: "24627-2", 
    display: "Magnetic resonance imaging study"
  },
  "CT Scan": {
    system: "http://loinc.org",
    code: "24604-1",
    display: "Computed tomography study"
  },
  "Urine Test": {
    system: "http://loinc.org",
    code: "24357-6",
    display: "Urinalysis complete panel"
  }
}

// SNOMED codes for common treatments
const treatmentCodes: Record<string, { system: string; code: string; display: string }> = {
  "Physical Therapy": {
    system: "http://snomed.info/sct",
    code: "108369006",
    display: "Physical therapy"
  },
  "Chemotherapy": {
    system: "http://snomed.info/sct", 
    code: "367336001",
    display: "Chemotherapy"
  },
  "Radiation Therapy": {
    system: "http://snomed.info/sct",
    code: "108290001", 
    display: "Radiation therapy"
  },
  "Surgery": {
    system: "http://snomed.info/sct",
    code: "387713003",
    display: "Surgical procedure"
  },
  "Medication": {
    system: "http://snomed.info/sct",
    code: "432102000",
    display: "Administration of substance"
  }
}

export function createTestOrder(testName: string, patientId: string, providerId: string): fhirclient.FHIR.Resource {
  const testCode = testCodes[testName]
  
  if (!testCode) {
    throw new Error(`Unknown test: ${testName}`)
  }

  return {
    resourceType: 'ServiceRequest',
    status: 'active',
    intent: 'order',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/service-category',
        code: 'diagnostic',
        display: 'Diagnostic'
      }]
    }],
    subject: {
      reference: `Patient/${patientId}`
    },
    requester: {
      reference: `Practitioner/${providerId}`
    },
    code: {
      coding: [testCode],
      text: testName
    },
    reasonCode: [{
      text: `Ordered ${testName} for diagnostic purposes`
    }]
  }
}

export function createTreatmentOrder(treatmentName: string, patientId: string, providerId: string): fhirclient.FHIR.Resource {
  const treatmentCode = treatmentCodes[treatmentName]
  
  if (!treatmentCode) {
    throw new Error(`Unknown treatment: ${treatmentName}`)
  }

  return {
    resourceType: 'ServiceRequest',
    status: 'active', 
    intent: 'order',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/service-category',
        code: 'therapeutic',
        display: 'Therapeutic'
      }]
    }],
    subject: {
      reference: `Patient/${patientId}`
    },
    requester: {
      reference: `Practitioner/${providerId}`
    },
    code: {
      coding: [treatmentCode],
      text: treatmentName
    },
    reasonCode: [{
      text: `Ordered ${treatmentName} for therapeutic purposes`
    }]
  }
}

// Export the available tests and treatments
export const availableTests = Object.keys(testCodes)
export const availableTreatments = Object.keys(treatmentCodes)

export function createOrder(type: 'test' | 'treatment', itemName: string, patientId: string, providerId: string): fhirclient.FHIR.Resource {
  if (type === 'test') {
    return createTestOrder(itemName, patientId, providerId)
  } else {
    return createTreatmentOrder(itemName, patientId, providerId)
  }
}
