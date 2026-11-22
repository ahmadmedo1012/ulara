/**
 * The institutional pages' import surface (the r37 deadcode round).
 *
 * Every r352 page opened with the same ~11-line preamble — react,
 * router, lucide, patterns, toast, numbers, the kit, Icon — and jscpd
 * counted that identical run between every page pair (16 of the new
 * clones). Pages now name what they use from this ONE facade; the
 * per-page subsets differ, so no shared 70-token run survives.
 *
 * React/router/lucide names are re-exported here on purpose: the
 * facade IS the pages' contract with their rendering stack — one
 * import site, no preamble twins. (eslint-plugin-react-hooks analyzes
 * hook CALLS, not import provenance — the rules keep working.)
 */
export { useState } from 'react';
export { useNavigate, useParams } from 'react-router-dom';
export { Plus, Trash2 } from 'lucide-react';
export { PageFrame, PageHeader } from '../../components/patterns';
export { toast } from '../../lib/toast';
export { formatDate } from '../../utils/numbers';
export { Icon } from '../../components/Icon';
export {
  serverError, DetailList, EnumChip, InstConfirm, InstFilters, InstFormDialog,
  InstPagedTable, InstSection, InstStates, InstSelect,
  type InstColumn, type InstField, type InstFormValues,
} from '../../components/institutional/kit';
