import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
  Award,
  Crown,
  Phone,
  PhoneCall,
  Mail,
  Home,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  MessageSquare,
  Copy,
  Check,
  AlertCircle,
  Calendar,
  Sparkles,
  ExternalLink,
  Info,
  Clock,
  Layers,
  Zap,
  Building,
  Building2,
  Tag,
  FolderPlus,
  RefreshCw,
} from 'lucide-react';
import { committeeApi } from '../api/committeeApi';
import { societyApi } from '../api/societyApi';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../constants/roles';

// Preset avatar photos for quick selection in admin modal
const AVATAR_PRESETS = [
  { label: 'Male Executive 1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { label: 'Male Executive 2', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { label: 'Female Executive 1', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { label: 'Female Executive 2', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
  { label: 'Male Professional', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { label: 'Female Professional', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80' },
];

const POSITION_CONFIG = {
  HEAD: {
    label: 'Head / Convener',
    icon: Crown,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    description: 'Committee leader, convener, and executive coordinator.',
  },
  CHAIRPERSON: {
    label: 'Chairperson',
    icon: Crown,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    description: 'Committee presiding officer and representative.',
  },
  PRESIDENT: {
    label: 'President',
    icon: Crown,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    description: 'Society chief executive, authority liaison, and overall governance head.',
  },
  SECRETARY: {
    label: 'Secretary',
    icon: Award,
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.14)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
    description: 'Administrative executive, meetings, notices, records, and society circulars.',
  },
  TREASURER: {
    label: 'Treasurer',
    icon: ShieldCheck,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    description: 'Financial custodian, maintenance dues, budgeting, accounts, and audits.',
  },
  CONVENER: {
    label: 'Convener',
    icon: Sparkles,
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.14)',
    borderColor: 'rgba(236, 72, 153, 0.4)',
    description: 'Coordinates meetings, agenda schedules, and committee initiatives.',
  },
  COORDINATOR: {
    label: 'Coordinator',
    icon: Zap,
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.14)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    description: 'Active committee event coordinator & resident focal point.',
  },
  COMMITTEE_MEMBER: {
    label: 'Committee Member',
    icon: Users,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.14)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    description: 'Resident committee representative for welfare, cultural, and facility wings.',
  },
  VICE_PRESIDENT: {
    label: 'Vice President',
    icon: Crown,
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.14)',
    borderColor: 'rgba(236, 72, 153, 0.4)',
    description: 'Deputizes executive oversight and key resident advisory committees.',
  },
  JOINT_SECRETARY: {
    label: 'Joint Secretary',
    icon: Award,
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.14)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    description: 'Assists secretarial compliance and committee documentations.',
  },
};

export default function CommitteePage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === ROLES.ADMIN;

  // Committees (e.g. Festival & Celebration Committee, Electricity Management Committee, etc.)
  const [committees, setCommittees] = useState([]);
  const [committeeMembers, setCommitteeMembers] = useState([]);
  const [societyHomes, setSocietyHomes] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState(isAdmin ? 'ALL' : (user?.societyId ? String(user.societyId) : 'ALL'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommitteeFilter, setSelectedCommitteeFilter] = useState('ALL');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Primary View Switcher: 'COMMITTEES' (All Society Committees) vs 'MEMBERS' (Assigned Members Directory)
  const [activeMainTab, setActiveMainTab] = useState('COMMITTEES');
  const [committeeSearch, setCommitteeSearch] = useState('');
  const [committeeStatusFilter, setCommitteeStatusFilter] = useState('ALL');
  const [committeeViewMode, setCommitteeViewMode] = useState('GRID'); // 'GRID' | 'TABLE'

  // Committee Delete & Edit state (Admin operations)
  const [committeeToDelete, setCommitteeToDelete] = useState(null);
  const [deletingCommitteeId, setDeletingCommitteeId] = useState(null);
  const [isEditCommitteeModalOpen, setIsEditCommitteeModalOpen] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState(null);
  const [editCommitteeFormData, setEditCommitteeFormData] = useState({
    name: '',
    description: '',
    status: 'ACTIVE',
  });
  const [updatingCommittee, setUpdatingCommittee] = useState(false);

  // User appointment if committee member
  const [userCommittees, setUserCommittees] = useState([]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateCommitteeModalOpen, setIsCreateCommitteeModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Home Occupants for the Member Assignment Form
  const [homeOccupants, setHomeOccupants] = useState([]);
  const [loadingOccupants, setLoadingOccupants] = useState(false);

  // Form State for Committee Name Creation (Admin)
  const [committeeFormData, setCommitteeFormData] = useState({
    name: '',
    description: '',
    status: 'ACTIVE',
  });
  const [creatingCommittee, setCreatingCommittee] = useState(false);
  const [assigningMember, setAssigningMember] = useState(false);

  // Form State for Committee Member Assignment
  const [formData, setFormData] = useState({
    committee_id: '',
    committee_name: '',
    home_id: '',
    home_number: '',
    user_id: '',
    name: '',
    phone: '',
    position: 'HEAD',
    custom_position: '',
    photo: AVATAR_PRESETS[0].url,
    status: 'ACTIVE',
    can_create_announcements: true,
    responsibilities: '',
  });

  // Load societies, committees and members
  const fetchAllData = async (socId = selectedSocietyId) => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (socId && socId !== 'ALL') {
        params.society_id = socId;
      }

      const promises = [
        committeeApi.getCommittees(params),
        committeeApi.getCommitteeMembers(params),
      ];

      if (isAdmin) {
        promises.push(societyApi.getAllHomes(params));
        promises.push(societyApi.getAllSocieties());
      }

      const results = await Promise.allSettled(promises);
      const commRes = results[0];
      const membersRes = results[1];
      const homesRes = results[2];
      const socRes = results[3];

      if (commRes && commRes.status === 'fulfilled') {
        const val = commRes.value;
        const list = Array.isArray(val?.data?.committees)
          ? val.data.committees
          : Array.isArray(val?.committees)
            ? val.committees
            : Array.isArray(val?.data)
              ? val.data
              : Array.isArray(val)
                ? val
                : [];
        setCommittees(list);
      }

      if (membersRes && membersRes.status === 'fulfilled') {
        const val = membersRes.value;
        const list = val?.data?.committeeMembers || val?.committeeMembers || (val?.success ? val.data?.committeeMembers : []);
        setCommitteeMembers(list || []);
      }

      if (homesRes && homesRes.status === 'fulfilled') {
        const val = homesRes.value;
        const homes = val?.data?.homes || val?.homes || (val?.success ? val.data?.homes : []);
        // Sort homes naturally by home_number
        const sorted = [...(homes || [])].sort((a, b) => {
          const numA = parseInt(a.home_number || a.flat_number, 10) || 0;
          const numB = parseInt(b.home_number || b.flat_number, 10) || 0;
          return numA - numB;
        });
        setSocietyHomes(sorted);
      }

      if (socRes && socRes.status === 'fulfilled') {
        const val = socRes.value;
        const rawSoc = val?.data?.societies || val?.societies || val?.data || val || [];
        const socList = Array.isArray(rawSoc) ? rawSoc : (Array.isArray(rawSoc?.societies) ? rawSoc.societies : []);
        setSocieties(socList);
      }
    } catch (err) {
      console.error('Failed to load committee data:', err);
      setError(err.message || err.response?.data?.message || 'Failed to load committee data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocietyChange = (socId) => {
    setSelectedSocietyId(socId);
    setSelectedCommitteeFilter('ALL');
    fetchAllData(socId);
  };

  // Load committee appointment for logged in resident
  const fetchMyCommitteeInfo = async () => {
    try {
      if (!isAdmin) {
        const permRes = await committeeApi.checkMyPermissions();
        if (permRes?.success || permRes?.data?.success) {
          const pData = permRes.data || permRes;
          setUserCommittees(pData.userCommittees || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user committees:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
    fetchMyCommitteeInfo();
  }, []);

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  // Fetch Home Occupants whenever Home No is selected in modal
  const handleHomeChange = async (homeId) => {
    const selectedHome = societyHomes.find((h) => String(h.id) === String(homeId));
    const homeNum = selectedHome ? selectedHome.home_number || selectedHome.flat_number : '';

    setFormData((prev) => ({
      ...prev,
      home_id: homeId,
      home_number: homeNum,
      user_id: '',
      name: '',
      phone: '',
    }));

    if (!homeId) {
      setHomeOccupants([]);
      return;
    }

    try {
      setLoadingOccupants(true);
      const res = await committeeApi.getHomeOccupants(homeId);
      if (res?.success || res?.data?.success) {
        const rawOccupants = res.data?.occupants || res.occupants || (Array.isArray(res.data) ? res.data : []);
        // Deduplicate occupants by user ID
        const uniqueMap = new Map();
        for (const occ of rawOccupants) {
          const uid = occ.user_id || occ.userId;
          if (uid && !uniqueMap.has(String(uid))) {
            uniqueMap.set(String(uid), {
              ...occ,
              user_id: uid,
              userId: uid,
              full_name: occ.full_name || occ.name,
              name: occ.name || occ.full_name,
              role_type: occ.role_type || occ.roleType,
              roleType: occ.roleType || occ.role_type,
            });
          }
        }
        const occupants = Array.from(uniqueMap.values());
        setHomeOccupants(occupants);

        // If only 1 occupant, auto-select them for convenience
        if (occupants.length === 1) {
          const occ = occupants[0];
          setFormData((prev) => ({
            ...prev,
            user_id: occ.user_id,
            name: occ.full_name,
            phone: occ.phone || '',
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load occupants for home:', err);
      setHomeOccupants([]);
    } finally {
      setLoadingOccupants(false);
    }
  };

  // Select a resident occupant living in the chosen home
  const handleOccupantSelect = (userId) => {
    const occupant = homeOccupants.find((o) => String(o.user_id || o.userId) === String(userId));
    if (occupant) {
      setFormData((prev) => ({
        ...prev,
        user_id: occupant.user_id || occupant.userId,
        name: occupant.full_name || occupant.name,
        phone: occupant.phone || '',
        home_number: occupant.home_number || occupant.homeNumber || prev.home_number,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        user_id: '',
        name: '',
        phone: '',
      }));
    }
  };

  // Open Create Committee Name Modal
  const handleOpenCreateCommitteeModal = () => {
    setCommitteeFormData({
      name: '',
      description: '',
      status: 'ACTIVE',
    });
    setIsCreateCommitteeModalOpen(true);
  };

  // Handle Save Committee Name
  const handleCreateCommitteeSubmit = async (e) => {
    e.preventDefault();
    if (!committeeFormData.name.trim()) {
      alert('Please enter a committee name');
      return;
    }

    try {
      setCreatingCommittee(true);
      const res = await committeeApi.createCommittee(committeeFormData);
      if (res?.success || res?.data?.success || res?.committee || res?.data?.committee) {
        showToast(`Committee "${committeeFormData.name}" created successfully!`);
        setIsCreateCommitteeModalOpen(false);
        setCommitteeFormData({ name: '', description: '', status: 'ACTIVE' });
        // Refresh committees
        const commRes = await committeeApi.getCommittees();
        const list = Array.isArray(commRes?.data?.committees)
          ? commRes.data.committees
          : Array.isArray(commRes?.committees)
            ? commRes.committees
            : Array.isArray(commRes?.data)
              ? commRes.data
              : Array.isArray(commRes)
                ? commRes
                : [];
        if (list.length > 0) {
          setCommittees(list);
        } else {
          fetchAllData();
        }
      } else {
        showToast(`Committee "${committeeFormData.name}" created!`);
        setIsCreateCommitteeModalOpen(false);
        fetchAllData();
      }
    } catch (err) {
      alert(err.message || err.response?.data?.message || 'Failed to create committee');
    } finally {
      setCreatingCommittee(false);
    }
  };

  // Open Edit Committee Modal
  const handleOpenEditCommitteeModal = (c) => {
    setEditingCommittee(c);
    setEditCommitteeFormData({
      name: c.name || '',
      description: c.description || '',
      status: c.status || 'ACTIVE',
    });
    setIsEditCommitteeModalOpen(true);
  };

  // Submit Edit Committee
  const handleUpdateCommitteeSubmit = async (e) => {
    e.preventDefault();
    if (!editCommitteeFormData.name.trim()) {
      alert('Please enter a committee name');
      return;
    }
    try {
      setUpdatingCommittee(true);
      await committeeApi.updateCommittee(editingCommittee.id, editCommitteeFormData);
      showToast(`Committee "${editCommitteeFormData.name}" updated successfully!`);
      setIsEditCommitteeModalOpen(false);
      setEditingCommittee(null);
      await fetchAllData();
    } catch (err) {
      alert(err.message || err.response?.data?.message || 'Failed to update committee');
    } finally {
      setUpdatingCommittee(false);
    }
  };

  // Confirm Delete Committee (Admin)
  const handleConfirmDeleteCommittee = async () => {
    if (!committeeToDelete) return;
    try {
      setDeletingCommitteeId(committeeToDelete.id);
      await committeeApi.deleteCommittee(committeeToDelete.id);
      showToast(`Committee "${committeeToDelete.name}" deleted successfully.`);
      const deletedId = committeeToDelete.id;
      setCommitteeToDelete(null);
      // Reset filter if deleted committee was active filter
      if (String(selectedCommitteeFilter) === String(deletedId)) {
        setSelectedCommitteeFilter('ALL');
      }
      await fetchAllData();
    } catch (err) {
      alert(err.message || err.response?.data?.message || 'Failed to delete committee');
    } finally {
      setDeletingCommitteeId(null);
    }
  };

  // Jump from committee card/table directly to members directory filtered by that committee
  const handleSwitchToCommitteeMembers = (committeeId) => {
    setSelectedCommitteeFilter(committeeId);
    setActiveMainTab('MEMBERS');
  };

  // Open Assign Member Modal
  const handleOpenCreateModal = async () => {
    const defaultComm = committees.length > 0 ? committees[0] : null;
    setFormData({
      committee_id: defaultComm ? defaultComm.id : '',
      committee_name: defaultComm ? defaultComm.name : 'Festival & Celebration Committee',
      home_id: '',
      home_number: '',
      user_id: '',
      name: '',
      phone: '',
      position: 'HEAD',
      custom_position: '',
      photo: AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)].url,
      status: 'ACTIVE',
      can_create_announcements: true,
      responsibilities: '',
    });
    setHomeOccupants([]);
    setIsCreateModalOpen(true);

    // Guarantee homes are loaded even if background load was pending
    if (societyHomes.length === 0) {
      try {
        const homesRes = await societyApi.getAllHomes();
        const homes = homesRes?.data?.homes || homesRes?.homes || (Array.isArray(homesRes) ? homesRes : []);
        const sorted = [...homes].sort((a, b) => (parseInt(a.home_number || a.flat_number, 10) || 0) - (parseInt(b.home_number || b.flat_number, 10) || 0));
        setSocietyHomes(sorted);
      } catch (err) {
        console.error('Failed to load homes in handleOpenCreateModal:', err);
      }
    }
  };

  // Open Edit Member Modal
  const handleOpenEditModal = (member) => {
    setSelectedMember(member);
    setFormData({
      committee_id: member.committee_id || '',
      committee_name: member.committee_name || '',
      home_id: member.home_id || '',
      home_number: member.home_number || '',
      user_id: member.user_id || '',
      name: member.name || '',
      phone: member.phone || '',
      position: member.position || member.designation || 'COMMITTEE_MEMBER',
      custom_position: '',
      photo: member.photo || member.photo_url || AVATAR_PRESETS[0].url,
      status: member.status || 'ACTIVE',
      can_create_announcements: member.can_create_announcements === 1 || member.can_create_announcements === true,
      responsibilities: member.responsibilities || '',
    });
    setIsEditModalOpen(true);
  };

  // Handle Save (Create) Committee Member
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.home_id) {
      alert('Please select a Home Number first (Step 2).');
      return;
    }
    if (!formData.name && !formData.user_id) {
      alert('Please select a resident member living in this home (Step 3).');
      return;
    }

    const selectedComm = committees.find((c) => String(c.id) === String(formData.committee_id));
    const commId = formData.committee_id || (committees.length > 0 ? committees[0].id : null);
    const commName = selectedComm ? selectedComm.name : (committees.length > 0 ? committees[0].name : (formData.committee_name || 'General Committee'));
    const finalPosition = formData.position === 'OTHER' ? (formData.custom_position || 'Member') : (formData.position || 'HEAD');

    try {
      setAssigningMember(true);
      const res = await committeeApi.createCommitteeMember({
        ...formData,
        committee_id: commId,
        committee_name: commName,
        position: finalPosition,
        designation: finalPosition,
        photo_url: formData.photo,
      });

      if (res?.success || res?.data?.success || res?.data?.committeeMember || res?.committeeMember || res?.member) {
        showToast(`Resident ${formData.name} assigned to ${commName}!`);
        setIsCreateModalOpen(false);
        fetchAllData();
      } else {
        showToast(`Resident ${formData.name} assigned!`);
        setIsCreateModalOpen(false);
        fetchAllData();
      }
    } catch (err) {
      console.error('Failed to assign committee member:', err);
      alert(err.message || err.response?.data?.message || 'Failed to assign committee member');
    } finally {
      setAssigningMember(false);
    }
  };

  // Handle Update Committee Member
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;
    const finalPosition = formData.position === 'OTHER' ? (formData.custom_position || 'Member') : formData.position;

    try {
      setLoading(true);
      const res = await committeeApi.updateCommitteeMember(selectedMember.id, {
        ...formData,
        position: finalPosition,
        designation: finalPosition,
        photo_url: formData.photo,
      });

      if (res?.success || res?.data?.success) {
        showToast(`Committee member ${formData.name} updated successfully!`);
        setIsEditModalOpen(false);
        setSelectedMember(null);
        fetchAllData();
      } else {
        showToast(`Committee member ${formData.name} updated!`);
        setIsEditModalOpen(false);
        setSelectedMember(null);
        fetchAllData();
      }
    } catch (err) {
      alert(err.message || err.response?.data?.message || 'Failed to update committee member');
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete Member
  const handleDeleteMember = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from this Committee?`)) {
      return;
    }
    try {
      setLoading(true);
      const res = await committeeApi.deleteCommitteeMember(id);
      if (res?.success || res?.data?.success) {
        showToast(`Committee member "${name}" removed.`);
        fetchAllData();
      } else {
        showToast(`Committee member "${name}" removed.`);
        fetchAllData();
      }
    } catch (err) {
      alert(err.message || err.response?.data?.message || 'Failed to remove committee member');
    } finally {
      setLoading(false);
    }
  };

  // Handle Call Action
  const handleCallMember = (member) => {
    setSelectedMember(member);
    setCopiedPhone(false);
    setIsCallModalOpen(true);
  };

  // Copy Phone Number
  const handleCopyPhone = (phoneNumber) => {
    if (!phoneNumber) return;
    navigator.clipboard.writeText(phoneNumber);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Filtered Committee Members
  const filteredMembers = committeeMembers.filter((m) => {
    const memberPosition = m.position || m.designation || '';
    const matchesSearch =
      !searchTerm ||
      (m.name && m.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.phone && m.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.home_number && String(m.home_number).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (memberPosition && memberPosition.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.committee_name && m.committee_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCommittee =
      selectedCommitteeFilter === 'ALL' ||
      String(m.committee_id) === String(selectedCommitteeFilter) ||
      m.committee_name === selectedCommitteeFilter;

    const matchesPosition =
      positionFilter === 'ALL' ||
      memberPosition === positionFilter ||
      m.designation === positionFilter;

    const matchesStatus =
      statusFilter === 'ALL' ||
      (m.status && m.status.toUpperCase() === statusFilter.toUpperCase());

    return matchesSearch && matchesCommittee && matchesPosition && matchesStatus;
  });

  // Filtered Committees (Name, Description, Status)
  const filteredCommittees = committees.filter((c) => {
    const q = (committeeSearch || '').toLowerCase();
    const matchesSearch =
      !q ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      (c.society_name && c.society_name.toLowerCase().includes(q));

    const matchesStatus =
      committeeStatusFilter === 'ALL' ||
      (c.status && c.status.toUpperCase() === committeeStatusFilter.toUpperCase());

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner / Toast message */}
      {successMsg && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.5)',
            color: '#34d399',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 600,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. TOP CENTER HERO IMAGE BANNER */}
      <div
        className="glass-panel"
        style={{
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          position: 'relative',
          minHeight: '250px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '38px 24px',
          boxShadow: '0 8px 30px rgba(196, 154, 108, 0.15)',
          border: '1px solid var(--color-sand)',
          background: 'var(--color-dark-brown)',
        }}
      >
        <img
          src="/images/society-committee-hero.png"
          alt="Society Committees & Leadership"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'brightness(0.38)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: '820px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <h1
            style={{
              fontSize: '2.3rem',
              fontWeight: 800,
              margin: 0,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.6)',
              lineHeight: 1.2,
            }}
          >
            Society Committees & Directory
          </h1>
        </div>
      </div>

      {/* 2. SUB-BANNER ACTION ROW: LEFT SIDE DESCRIPTION TEXT & RIGHT SIDE BUTTONS */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <p
          style={{
            margin: 0,
            color: 'var(--text-muted)',
            fontSize: '0.92rem',
            lineHeight: 1.5,
            maxWidth: '680px',
            flex: '1 1 320px',
          }}
        >
          Direct contact directory of dedicated society committees (Festival, Electricity, Water & Maintenance) and assigned resident representatives.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {isAdmin && societies.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#FFFFFF',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Society:</span>
              <select
                value={selectedSocietyId}
                onChange={(e) => handleSocietyChange(e.target.value)}
                className="input-field"
                style={{
                  width: 'auto',
                  padding: '4px 8px',
                  margin: 0,
                  height: '32px',
                  fontSize: '0.825rem',
                  borderRadius: 'var(--radius-sm)',
                  background: '#FFFFFF',
                  color: 'var(--color-dark-brown)',
                  border: 'none',
                }}
              >
                <option value="ALL">All Societies</option>
                {societies.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={handleOpenCreateCommitteeModal}
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: '#FFFFFF',
                  border: '1.5px solid var(--color-sand)',
                  color: 'var(--color-dark-brown)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <FolderPlus size={15} /> + Create Committee
              </button>

              <button
                onClick={handleOpenCreateModal}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: 'var(--color-clay)',
                  boxShadow: '0 4px 14px rgba(196, 154, 108, 0.4)',
                }}
              >
                <Plus size={16} /> Assign Member
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. KPI Stats Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Society Committees</span>
            <Crown size={20} style={{ color: 'var(--color-clay)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px', color: 'var(--text-main)' }}>
            {committees.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Registered committee wings for {(Array.isArray(societies) ? societies.find((s) => String(s.id) === String(selectedSocietyId))?.name : null) || user?.societyName || 'Active Society'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Committee Members</span>
            <Users size={20} style={{ color: '#b45309' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px', color: '#b45309' }}>
            {committeeMembers.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Assigned resident members representing wings
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Members On-Duty</span>
            <CheckCircle2 size={20} style={{ color: 'var(--color-fern-green)' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px', color: 'var(--color-fern-green)' }}>
            {committeeMembers.filter((m) => m.status === 'ACTIVE').length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Currently active & verified council members
          </div>
        </div>
      </div>

      {/* 3. Official Committee Post Banner for Logged-in Member */}
      {userCommittees && userCommittees.length > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: '20px 24px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(196, 154, 108, 0.18) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            boxShadow: '0 4px 18px rgba(245, 158, 11, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
                flexShrink: 0,
              }}
            >
              <Crown size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#b45309' }}>
                  Official Committee Appointment
                </span>
                <span style={{ background: 'rgba(16, 185, 129, 0.18)', color: 'var(--color-fern-green)', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  Active Office Bearer
                </span>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginTop: '3px' }}>
                {user?.fullName || 'Resident Member'} —{' '}
                <span style={{ color: 'var(--color-clay)' }}>
                  {userCommittees.map((uc) => `${uc.committee_name || 'Society Committee'} (${uc.designation})`).join(', ')}
                </span>
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                Representing Home {user?.flatNumber || userCommittees[0]?.home_number || 'Unit'} • You are officially recognized as a governing committee member of the society.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. PRIMARY VIEW TAB SWITCHER: ALL COMMITTEES VS ASSIGNED MEMBERS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '2px solid var(--color-sand)',
          paddingBottom: '2px',
          marginTop: '6px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveMainTab('COMMITTEES')}
          style={{
            padding: '10px 20px',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeMainTab === 'COMMITTEES' ? '3px solid var(--color-clay)' : '3px solid transparent',
            color: activeMainTab === 'COMMITTEES' ? 'var(--color-clay)' : 'var(--text-muted)',
            transition: 'all 0.2s ease',
            marginBottom: '-2px',
          }}
        >
          <Building2 size={18} />
          <span>All Society Committees</span>
          <span
            style={{
              background: activeMainTab === 'COMMITTEES' ? 'rgba(196, 154, 108, 0.2)' : 'var(--color-sand)',
              color: activeMainTab === 'COMMITTEES' ? 'var(--color-dark-brown)' : 'var(--text-dim)',
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: 700,
            }}
          >
            {committees.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('MEMBERS')}
          style={{
            padding: '10px 20px',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeMainTab === 'MEMBERS' ? '3px solid var(--color-clay)' : '3px solid transparent',
            color: activeMainTab === 'MEMBERS' ? 'var(--color-clay)' : 'var(--text-muted)',
            transition: 'all 0.2s ease',
            marginBottom: '-2px',
          }}
        >
          <Users size={18} />
          <span>Assigned Members Directory</span>
          <span
            style={{
              background: activeMainTab === 'MEMBERS' ? 'rgba(196, 154, 108, 0.2)' : 'var(--color-sand)',
              color: activeMainTab === 'MEMBERS' ? 'var(--color-dark-brown)' : 'var(--text-dim)',
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: 700,
            }}
          >
            {committeeMembers.length}
          </span>
        </button>
      </div>

      {/* 5A. ALL COMMITTEES VIEW (NAME, DESCRIPTION, STATUS & ADMIN DELETE) */}
      {activeMainTab === 'COMMITTEES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Controls Bar: Search, Status Filter, Grid/Table Switcher, Create Button */}
          <div
            className="glass-panel"
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-sand)',
              background: 'var(--color-white)',
              boxShadow: '0 2px 10px rgba(196, 154, 108, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-clay)' }} />
                <input
                  type="text"
                  placeholder="Search committee by name, description, society..."
                  value={committeeSearch}
                  onChange={(e) => setCommitteeSearch(e.target.value)}
                  className="input-field"
                  style={{
                    width: '100%',
                    paddingLeft: '40px',
                    margin: 0,
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-sand)',
                    color: 'var(--color-dark-brown)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Status:</span>
                <select
                  value={committeeStatusFilter}
                  onChange={(e) => setCommitteeStatusFilter(e.target.value)}
                  className="input-field"
                  style={{
                    width: 'auto',
                    padding: '6px 12px',
                    margin: 0,
                    height: '40px',
                    fontSize: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-sand)',
                    background: 'var(--color-background)',
                    color: 'var(--color-dark-brown)',
                  }}
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              {/* Grid / Table View Switcher */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-sand)',
                  borderRadius: 'var(--radius-md)',
                  padding: '3px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setCommitteeViewMode('GRID')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    background: committeeViewMode === 'GRID' ? 'var(--color-clay)' : 'transparent',
                    color: committeeViewMode === 'GRID' ? '#FFFFFF' : 'var(--color-dark-brown)',
                    cursor: 'pointer',
                  }}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setCommitteeViewMode('TABLE')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    background: committeeViewMode === 'TABLE' ? 'var(--color-clay)' : 'transparent',
                    color: committeeViewMode === 'TABLE' ? '#FFFFFF' : 'var(--color-dark-brown)',
                    cursor: 'pointer',
                  }}
                >
                  Table
                </button>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenCreateCommitteeModal}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: 'var(--color-clay)',
                    boxShadow: '0 4px 14px rgba(196, 154, 108, 0.4)',
                  }}
                >
                  <Plus size={16} /> Create Committee
                </button>
              )}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="pulse-indicator" style={{ width: '12px', height: '12px', marginBottom: '12px' }} />
              <div>Loading society committees...</div>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredCommittees.length === 0 && (
            <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: 'var(--radius-lg)', background: 'var(--color-white)', border: '1px solid var(--color-sand)' }}>
              <Building2 size={48} color="var(--color-clay)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-dark-brown)' }}>No committees found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px', maxWidth: '500px', margin: '0 auto 16px auto' }}>
                {committeeSearch || committeeStatusFilter !== 'ALL'
                  ? 'No committees match your search or status filter.'
                  : 'No society committees have been created yet. Create one to organize society management wings.'}
              </p>
              {isAdmin && (
                <button type="button" onClick={handleOpenCreateCommitteeModal} className="btn btn-primary">
                  <Plus size={16} /> Create First Committee
                </button>
              )}
            </div>
          )}

          {/* GRID CARDS VIEW */}
          {!loading && filteredCommittees.length > 0 && committeeViewMode === 'GRID' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '20px',
              }}
            >
              {filteredCommittees.map((c) => (
                <div
                  key={c.id}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-sand)',
                    background: 'var(--color-white)',
                    boxShadow: '0 4px 16px rgba(196, 154, 108, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    {/* Top row: icon + status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: 'rgba(196, 154, 108, 0.16)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-clay)',
                        }}
                      >
                        <Building2 size={22} />
                      </div>

                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: c.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(156, 163, 175, 0.18)',
                          color: c.status === 'ACTIVE' ? 'var(--color-fern-green)' : 'var(--text-dim)',
                          border: c.status === 'ACTIVE' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(156, 163, 175, 0.3)',
                        }}
                      >
                        {c.status === 'ACTIVE' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        <span>{c.status || 'ACTIVE'}</span>
                      </span>
                    </div>

                    {/* Committee Name */}
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-dark-brown)', margin: '0 0 8px 0', lineHeight: 1.3 }}>
                      {c.name}
                    </h3>

                    {/* Committee Description */}
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 14px 0', lineHeight: 1.5, minHeight: '40px' }}>
                      {c.description || 'No specific description provided for this society committee.'}
                    </p>

                    {/* Meta Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid rgba(196, 154, 108, 0.15)' }}>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--color-dark-brown)',
                          background: 'rgba(196, 154, 108, 0.12)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Users size={13} style={{ color: 'var(--color-clay)' }} />
                        {c.member_count || 0} Members
                      </span>

                      {c.society_name && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Building size={12} /> {c.society_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      paddingTop: '14px',
                      borderTop: '1px solid rgba(196, 154, 108, 0.15)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSwitchToCommitteeMembers(c.id)}
                      className="btn btn-outline"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        flex: 1,
                        justifyContent: 'center',
                      }}
                    >
                      <Users size={14} />
                      <span>View Members ({c.member_count || 0})</span>
                    </button>

                    {isAdmin && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditCommitteeModal(c)}
                          className="btn btn-outline"
                          style={{
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-sand)',
                          }}
                          title="Edit Committee"
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setCommitteeToDelete(c)}
                          className="btn btn-outline"
                          style={{
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            color: '#ef4444',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.05)',
                          }}
                          title="Delete Committee"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TABLE VIEW */}
          {!loading && filteredCommittees.length > 0 && committeeViewMode === 'TABLE' && (
            <div
              className="glass-panel"
              style={{
                overflowX: 'auto',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-sand)',
                background: 'var(--color-white)',
                boxShadow: '0 4px 20px rgba(196, 154, 108, 0.08)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(196, 154, 108, 0.1)', borderBottom: '1px solid var(--color-sand)' }}>
                    <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--color-dark-brown)' }}>Committee Name</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--color-dark-brown)' }}>Description</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--color-dark-brown)' }}>Status</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--color-dark-brown)' }}>Members</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--color-dark-brown)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommittees.map((c, idx) => (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid rgba(196, 154, 108, 0.12)',
                        background: idx % 2 === 0 ? '#FFFFFF' : 'rgba(247, 244, 238, 0.35)',
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              background: 'rgba(196, 154, 108, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--color-clay)',
                              flexShrink: 0,
                            }}
                          >
                            <Building2 size={16} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--color-dark-brown)' }}>{c.name}</div>
                            {c.society_name && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{c.society_name}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', maxWidth: '380px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                          {c.description || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>No description</span>}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: c.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(156, 163, 175, 0.18)',
                            color: c.status === 'ACTIVE' ? 'var(--color-fern-green)' : 'var(--text-dim)',
                            border: c.status === 'ACTIVE' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(156, 163, 175, 0.3)',
                          }}
                        >
                          {c.status === 'ACTIVE' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          <span>{c.status || 'ACTIVE'}</span>
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: 'var(--color-dark-brown)',
                            background: 'rgba(196, 154, 108, 0.12)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.8rem',
                          }}
                        >
                          <Users size={13} style={{ color: 'var(--color-clay)' }} />
                          {c.member_count || 0}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleSwitchToCommitteeMembers(c.id)}
                            className="btn btn-outline"
                            style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700 }}
                          >
                            View Members
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditCommitteeModal(c)}
                                className="btn btn-outline"
                                style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}
                                title="Edit Committee"
                              >
                                <Edit2 size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setCommitteeToDelete(c)}
                                className="btn btn-outline"
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  color: '#ef4444',
                                  borderColor: 'rgba(239, 68, 68, 0.3)',
                                  background: 'rgba(239, 68, 68, 0.05)',
                                }}
                                title="Delete Committee"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5B. ASSIGNED MEMBERS DIRECTORY VIEW */}
      {activeMainTab === 'MEMBERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Selected Committee Details Banner (shows Name, Description, Status and Admin Delete) */}
          {selectedCommitteeFilter !== 'ALL' && (() => {
            const activeComm = committees.find(
              (c) => String(c.id) === String(selectedCommitteeFilter) || c.name === selectedCommitteeFilter
            );
            if (!activeComm) return null;
            return (
              <div
                className="glass-panel"
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-sand)',
                  background: 'linear-gradient(135deg, rgba(196, 154, 108, 0.08) 0%, rgba(247, 244, 238, 0.6) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <Building2 size={18} style={{ color: 'var(--color-clay)' }} />
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-dark-brown)' }}>
                      {activeComm.name}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: activeComm.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(156, 163, 175, 0.18)',
                        color: activeComm.status === 'ACTIVE' ? 'var(--color-fern-green)' : 'var(--text-dim)',
                      }}
                    >
                      {activeComm.status}
                    </span>
                  </div>
                  {activeComm.description && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {activeComm.description}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCommitteeFilter('ALL')}
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    Show All Committees
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEditCommitteeModal(activeComm)}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommitteeToDelete(activeComm)}
                        className="btn btn-outline"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#ef4444',
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                          background: 'rgba(239, 68, 68, 0.05)',
                        }}
                      >
                        <Trash2 size={13} /> Delete Committee
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Committee Filter Chips Bar with SHOW ALL Button */}
          <div
            className="glass-panel"
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              overflowX: 'auto',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-sand)',
              background: 'var(--color-white)',
              boxShadow: '0 2px 10px rgba(196, 154, 108, 0.05)',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-clay)', textTransform: 'uppercase', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={15} /> Filter:
            </span>

        {/* SHOW ALL BUTTON */}
        <button
          onClick={() => setSelectedCommitteeFilter('ALL')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: selectedCommitteeFilter === 'ALL' ? '2px solid var(--color-clay)' : '1px solid var(--color-sand)',
            background: selectedCommitteeFilter === 'ALL' ? 'var(--color-clay)' : 'var(--color-background)',
            color: selectedCommitteeFilter === 'ALL' ? '#FFFFFF' : 'var(--color-dark-brown)',
            boxShadow: selectedCommitteeFilter === 'ALL' ? '0 3px 12px rgba(196, 154, 108, 0.35)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <Users size={15} />
          <span>Show All ({committeeMembers.length})</span>
        </button>

        {/* Individual Committee Chips */}
        {committees.map((c) => {
          const isSelected = String(selectedCommitteeFilter) === String(c.id) || selectedCommitteeFilter === c.name;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCommitteeFilter(c.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                border: isSelected ? '2px solid var(--color-clay)' : '1px solid var(--color-sand)',
                background: isSelected ? 'var(--color-clay)' : 'var(--color-background)',
                color: isSelected ? '#FFFFFF' : 'var(--color-dark-brown)',
                boxShadow: isSelected ? '0 3px 10px rgba(196, 154, 108, 0.3)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {c.name}
            </button>
          );
        })}

        {isAdmin && (
          <button
            onClick={handleOpenCreateCommitteeModal}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px dashed var(--color-clay)',
              background: 'transparent',
              color: 'var(--color-clay)',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Plus size={14} /> Add Committee
          </button>
        )}
      </div>

      {/* 5. Search Bar, Position Filter, Status Filter & Row-Column View Toggle */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-sand)',
          background: 'var(--color-white)',
          boxShadow: '0 2px 10px rgba(196, 154, 108, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-clay)' }} />
            <input
              type="text"
              placeholder="Search by member name, committee, home no (e.g. 2)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{
                width: '100%',
                paddingLeft: '40px',
                margin: 0,
                height: '42px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-background)',
                border: '1px solid var(--color-sand)',
                color: 'var(--color-dark-brown)',
                fontSize: '0.875rem',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Position:</span>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="input-field"
              style={{
                width: 'auto',
                padding: '6px 12px',
                margin: 0,
                height: '40px',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-sand)',
                background: 'var(--color-background)',
                color: 'var(--color-dark-brown)',
              }}
            >
              <option value="ALL">All Positions</option>
              <option value="HEAD">Head / Convener</option>
              <option value="CHAIRPERSON">Chairperson</option>
              <option value="PRESIDENT">President</option>
              <option value="SECRETARY">Secretary</option>
              <option value="TREASURER">Treasurer</option>
              <option value="COMMITTEE_MEMBER">Committee Member</option>
              <option value="COORDINATOR">Coordinator</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
              style={{
                width: 'auto',
                padding: '6px 12px',
                margin: 0,
                height: '40px',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-sand)',
                background: 'var(--color-background)',
                color: 'var(--color-dark-brown)',
              }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* 6. Loading State */}
      {loading && (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="pulse-indicator" style={{ width: '12px', height: '12px', marginBottom: '12px' }} />
          <div>Loading Society Committee members & wings...</div>
        </div>
      )}

      {/* 7. Empty State */}
      {!loading && filteredMembers.length === 0 && (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: 'var(--radius-lg)', background: 'var(--color-white)', border: '1px solid var(--color-sand)' }}>
          <Users size={48} color="var(--color-clay)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-dark-brown)' }}>No committee members found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px', maxWidth: '500px', margin: '0 auto 16px auto' }}>
            {searchTerm || selectedCommitteeFilter !== 'ALL' || positionFilter !== 'ALL'
              ? 'No members match the current search or filter criteria.'
              : 'No resident members have been assigned to this committee yet.'}
          </p>
          {isAdmin && (
            <button onClick={handleOpenCreateModal} className="btn btn-primary">
              <Plus size={16} /> Assign First Committee Member
            </button>
          )}
        </div>
      )}

      {/* 8. ROW-COLUMN TABLE VIEW */}
      {!loading && filteredMembers.length > 0 && (
        <div
          className="glass-panel"
          style={{
            overflowX: 'auto',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-sand)',
            background: 'var(--color-white)',
            boxShadow: '0 4px 20px rgba(196, 154, 108, 0.08)',
            padding: '4px',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid var(--color-sand)',
                  background: 'var(--color-background)',
                  color: 'var(--color-clay)',
                }}
              >
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Member</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Committee Wing</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Position</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Home / Flat</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Phone Contact</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => {
                const cfg = POSITION_CONFIG[m.position] || POSITION_CONFIG.COMMITTEE_MEMBER;
                return (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: '1px solid var(--color-sand)',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(196, 154, 108, 0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={m.photo || m.photo_url || AVATAR_PRESETS[0].url}
                          alt={m.name}
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            objectFit: 'cover',
                            border: '1.5px solid var(--color-sand)',
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.925rem' }}>
                              {m.name}
                            </span>
                            {(m.user_id === user?.id || (m.phone && user?.phone && m.phone.replace(/\D/g, '') === user?.phone.replace(/\D/g, ''))) && (
                              <span
                                style={{
                                  background: 'rgba(196, 154, 108, 0.2)',
                                  color: 'var(--color-clay)',
                                  fontSize: '0.68rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 800,
                                }}
                              >
                                YOU
                              </span>
                            )}
                          </div>
                          {m.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          background: 'rgba(196, 154, 108, 0.15)',
                          color: 'var(--color-clay)',
                          border: '1px solid var(--color-sand)',
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        {m.committee_name || 'General Committee'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          background: cfg.bgColor,
                          color: cfg.color,
                          border: `1px solid ${cfg.borderColor}`,
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        {m.position || cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: 'var(--color-clay)',
                          background: 'var(--color-background)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-sand)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.825rem',
                        }}
                      >
                        <Home size={13} /> Home {m.home_number || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontFamily: 'monospace', color: 'var(--color-dark-brown)', fontWeight: 600 }}>
                        {m.phone || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          background: m.status === 'ACTIVE' ? 'rgba(107, 142, 90, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                          color: m.status === 'ACTIVE' ? 'var(--color-fern-green)' : '#94a3b8',
                          border: m.status === 'ACTIVE' ? '1px solid rgba(107, 142, 90, 0.3)' : '1px solid #cbd5e1',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <a
                          href={m.phone ? `tel:${m.phone}` : '#'}
                          onClick={(e) => {
                            if (!m.phone) {
                              e.preventDefault();
                              alert('Phone number not available');
                            }
                          }}
                          className="btn"
                          style={{
                            background: 'rgba(107, 142, 90, 0.15)',
                            color: 'var(--color-fern-green)',
                            border: '1px solid rgba(107, 142, 90, 0.35)',
                            padding: '6px 14px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-sm)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <PhoneCall size={13} />
                          {/* <span>Call</span> */}
                        </a>

                        <button
                          onClick={() => handleCallMember(m)}
                          className="btn btn-outline"
                          style={{
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-sand)',
                            color: 'var(--color-dark-brown)',
                          }}
                          title="WhatsApp / Contact"
                        >
                          <MessageSquare size={14} />
                        </button>

                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(m)}
                              className="btn btn-outline"
                              style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-sand)' }}
                              title="Edit Member"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(m.id, m.name)}
                              className="btn btn-danger"
                              style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}
                              title="Delete Member"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
        </div>
      )}

      {/* MODAL 1: CREATE COMMITTEE NAME (Admin Only) */}
      {isCreateCommitteeModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '28px',
              border: '1px solid var(--border-card)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Create Society Committee</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Define a new committee name (e.g. Festival, Electricity, Water)
                </div>
              </div>
              <button
                onClick={() => setIsCreateCommitteeModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCommitteeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Committee Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Festival & Celebration Committee, Electricity Management Committee"
                  value={committeeFormData.name}
                  onChange={(e) => setCommitteeFormData({ ...committeeFormData, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Description / Scope (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Responsible for Navratri, Diwali, Ganesh Utsav arrangements and society cultural events."
                  value={committeeFormData.description}
                  onChange={(e) => setCommitteeFormData({ ...committeeFormData, description: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Status</label>
                <select
                  value={committeeFormData.status}
                  onChange={(e) => setCommitteeFormData({ ...committeeFormData, status: e.target.value })}
                  className="input-field"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              {/* Quick suggestions */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                <span>Quick suggestions: </span>
                <span
                  style={{ color: '#fbbf24', cursor: 'pointer', textDecoration: 'underline', marginRight: '8px' }}
                  onClick={() => setCommitteeFormData({ ...committeeFormData, name: 'Festival & Celebration Committee' })}
                >
                  Festival & Celebration
                </span>
                <span
                  style={{ color: '#fbbf24', cursor: 'pointer', textDecoration: 'underline', marginRight: '8px' }}
                  onClick={() => setCommitteeFormData({ ...committeeFormData, name: 'Electricity Management Committee' })}
                >
                  Electricity Management
                </span>
                <span
                  style={{ color: '#fbbf24', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setCommitteeFormData({ ...committeeFormData, name: 'Water & Sanitation Committee' })}
                >
                  Water & Sanitation
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateCommitteeModalOpen(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}
                  disabled={creatingCommittee}
                >
                  {creatingCommittee && <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  <span>{creatingCommittee ? 'Creating...' : 'Create Committee'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN COMMITTEE MEMBER (Select Home No -> Select Member -> Position -> Status) */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '580px',
              padding: '28px',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid var(--border-card)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Assign Committee Member</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Select Home No, choose the resident occupant, and assign designation
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Step 1: Select Committee */}
              <div className="input-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-label">1. Select Committee *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      handleOpenCreateCommitteeModal();
                    }}
                    style={{ background: 'none', border: 'none', color: '#fbbf24', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                  >
                    + New Committee
                  </button>
                </div>
                <select
                  required
                  value={formData.committee_id}
                  onChange={(e) => setFormData({ ...formData, committee_id: e.target.value })}
                  className="input-field"
                  style={{ color: 'var(--color-dark-brown)', backgroundColor: '#FFFFFF', border: '1px solid var(--border-card)' }}
                >
                  <option value="" style={{ color: 'var(--text-muted)', backgroundColor: '#FFFFFF' }}>-- Choose Committee --</option>
                  {committees.map((c) => (
                    <option key={c.id} value={c.id} style={{ color: '#403630', backgroundColor: '#FFFFFF' }}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Home No (Prompt: "when create comiite member frist slect home no") */}
              <div className="input-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="input-label" style={{ margin: 0 }}>2. Select Home No *</label>
                  <span style={{ fontSize: '0.75rem', color: societyHomes.length > 0 ? '#38bdf8' : '#fb7185', fontWeight: 600 }}>
                    {societyHomes.length > 0 ? `${societyHomes.length} Units Available` : 'Loading Homes...'}
                  </span>
                </div>
                <select
                  required
                  value={formData.home_id}
                  onChange={(e) => handleHomeChange(e.target.value)}
                  className="input-field"
                  style={{ color: 'var(--color-dark-brown)', backgroundColor: '#FFFFFF', border: '1px solid var(--border-card)' }}
                >
                  <option value="" style={{ color: 'var(--text-muted)', backgroundColor: '#FFFFFF' }}>
                    {societyHomes.length === 0 ? '-- Loading Home Numbers... --' : '-- Choose Home Number --'}
                  </option>
                  {societyHomes.map((h) => {
                    const socTag = h.society_name ? `[${h.society_name}] ` : '';
                    return (
                      <option key={h.id} value={h.id} style={{ color: '#403630', backgroundColor: '#FFFFFF' }}>
                        {socTag}Home {h.home_number || h.flat_number} {h.block_or_tower ? `(${h.block_or_tower})` : ''} - {h.status || h.occupancy_status || 'Occupied'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Step 3: Select Resident Member (Prompt: "after show member name: tanmay owner, abc family member") */}
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">3. Select Resident Member * (Always a resident user)</label>
                {loadingOccupants ? (
                  <div style={{ fontSize: '0.825rem', color: '#fbbf24', padding: '8px 0' }}>
                    Loading resident occupants living in Home {formData.home_number}...
                  </div>
                ) : !formData.home_id ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', padding: '6px 0' }}>
                    ↑ Please select a Home No above to view its resident members.
                  </div>
                ) : homeOccupants.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#f87171', padding: '6px 0' }}>
                    No registered resident users found for Home {formData.home_number}. Please register an owner, tenant, or family member first.
                  </div>
                ) : (
                  <select
                    required
                    value={formData.user_id}
                    onChange={(e) => handleOccupantSelect(e.target.value)}
                    className="input-field"
                    style={{
                      color: 'var(--color-dark-brown)',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border-card)',
                    }}
                  >
                    <option value="" style={{ color: 'var(--text-muted)', backgroundColor: '#FFFFFF' }}>
                      -- Select occupant living in Home {formData.home_number} --
                    </option>
                    {homeOccupants.map((occ) => {
                      const id = occ.user_id || occ.userId;
                      const name = occ.full_name || occ.name || 'Resident';
                      const role = occ.role_type || occ.roleType;
                      const roleLabel =
                        role === 'FAMILY_MEMBER'
                          ? (occ.relation ? `Family Member - ${occ.relation}` : 'Family Member')
                          : role === 'OWNER'
                            ? 'Owner'
                            : role === 'TENANT'
                              ? 'Tenant'
                              : (role || '');
                      return (
                        <option
                          key={id}
                          value={id}
                          style={{ color: '#403630', backgroundColor: '#FFFFFF' }}
                        >
                          {name}{roleLabel ? ` (${roleLabel})` : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Auto-populated details display */}
              {formData.name && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.825rem',
                    color: '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>
                    Selected: <strong>{formData.name}</strong> • Home: {formData.home_number}
                  </span>
                </div>
              )}

              {/* Step 4: Position / Designation & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">4. Position / Designation *</label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="input-field"
                    style={{ color: 'var(--color-dark-brown)', backgroundColor: '#FFFFFF', border: '1px solid var(--border-card)' }}
                    required
                  >
                    <option value="HEAD" style={{ color: '#403630', backgroundColor: '#FFFFFF' }}>HEAD / CONVENER</option>
                    <option value="CHAIRPERSON" style={{ color: '#403630', backgroundColor: '#FFFFFF' }}>CHAIRPERSON</option>
                    <option value="PRESIDENT" style={{ color: '#403630', backgroundColor: '#FFFFFF' }}>PRESIDENT</option>
                    <option value="SECRETARY" style={{ color: '#403630', backgroundColor: '#FFFFFF' }}>SECRETARY</option>
                    <option value="TREASURER" style={{ color: '#403630', backgroundColor: '#FFFFFF' }}>TREASURER</option>
                    <option value="COORDINATOR" style={{ color: '#403630', backgroundColor: '#FFFFFF' }}>COORDINATOR</option>
                    <option value="COMMITTEE_MEMBER" style={{ color: '#403630', backgroundColor: '#FFFFFF' }}>COMMITTEE MEMBER</option>
                    <option value="OTHER" style={{ color: '#403630', backgroundColor: '#FFFFFF' }}>Other (Custom Title)</option>
                  </select>
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">5. Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                    style={{ color: 'var(--color-dark-brown)', backgroundColor: '#FFFFFF', border: '1px solid var(--border-card)' }}
                  >
                    <option value="ACTIVE" style={{ color: '#403630', backgroundColor: '#FFFFFF' }}>ACTIVE</option>
                    <option value="INACTIVE" style={{ color: '#403630', backgroundColor: '#FFFFFF' }}>INACTIVE</option>
                  </select>
                </div>
              </div>

              {formData.position === 'OTHER' && (
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Custom Designation Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Festival Cultural Lead, Electricity Liaison"
                    value={formData.custom_position}
                    onChange={(e) => setFormData({ ...formData, custom_position: e.target.value })}
                    className="input-field"
                  />
                </div>
              )}

              {/* Responsibilities / Scope */}
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Responsibilities / Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Leads festival planning, stage decorations, and cultural programs"
                  value={formData.responsibilities}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  className="input-field"
                />
              </div>

              {/* Avatar Selection */}
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Photo Avatar</label>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0' }}>
                  {AVATAR_PRESETS.map((p, idx) => (
                    <img
                      key={idx}
                      src={p.url}
                      alt={p.label}
                      title={p.label}
                      onClick={() => setFormData({ ...formData, photo: p.url })}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: formData.photo === p.url ? '2px solid var(--color-clay)' : '2px solid transparent',
                        opacity: formData.photo === p.url ? 1 : 0.6,
                        objectFit: 'cover',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Toggle: Announcement Permission */}
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                }}
                onClick={() => setFormData({ ...formData, can_create_announcements: !formData.can_create_announcements })}
              >
                <input
                  type="checkbox"
                  id="create_ann_perm"
                  checked={formData.can_create_announcements}
                  onChange={(e) => setFormData({ ...formData, can_create_announcements: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#6366f1', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    Grant Announcement Creation Permission
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Allows this committee member (e.g. {formData.name || 'tanmay'}) to create announcements regarding their committee.
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={assigningMember}
                  style={{
                    background: 'var(--grad-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: assigningMember ? 'not-allowed' : 'pointer',
                  }}
                >
                  {assigningMember && <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  <span>{assigningMember ? 'Assigning...' : 'Assign Committee Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT COMMITTEE MEMBER */}
      {isEditModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '28px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Edit Committee Member</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Update designation, home, or privileges for {formData.name}
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Committee</label>
                <select
                  value={formData.committee_id}
                  onChange={(e) => setFormData({ ...formData, committee_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">-- General Committee --</option>
                  {committees.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Position *</label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Home Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.home_number}
                    onChange={(e) => setFormData({ ...formData, home_number: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Responsibilities & Scope</label>
                <input
                  type="text"
                  value={formData.responsibilities}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  className="input-field"
                />
              </div>

              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                }}
                onClick={() => setFormData({ ...formData, can_create_announcements: !formData.can_create_announcements })}
              >
                <input
                  type="checkbox"
                  checked={formData.can_create_announcements}
                  onChange={(e) => setFormData({ ...formData, can_create_announcements: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#6366f1', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    Grant Announcement Creation Permission
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Allow this committee member to post circulars.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: QUICK CONTACT & CALL DIALER */}
      {isCallModalOpen && selectedMember && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '28px',
              textAlign: 'center',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <img
              src={selectedMember.photo || selectedMember.photo_url || AVATAR_PRESETS[0].url}
              alt={selectedMember.name}
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '14px',
                objectFit: 'cover',
                border: '3px solid var(--color-clay)',
                boxShadow: '0 4px 20px rgba(196, 154, 108, 0.3)',
                margin: '0 auto 14px auto',
              }}
            />

            <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              {selectedMember.committee_name || 'Society Committee'}
            </div>

            <div style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase' }}>
              {selectedMember.position}
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 6px 0' }}>
              {selectedMember.name}
            </h3>

            <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 700, marginBottom: '18px' }}>
              Home Number: <strong>Home {selectedMember.home_number || 'N/A'}</strong>
            </div>

            {/* Phone Display Box */}
            <div
              style={{
                background: 'var(--bg-tertiary)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-card)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Direct Number</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '0.04em' }}>
                  {selectedMember.phone || 'No phone listed'}
                </div>
              </div>

              <button
                onClick={() => handleCopyPhone(selectedMember.phone)}
                className="btn btn-outline"
                style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {copiedPhone ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Direct Contact Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href={selectedMember.phone ? `tel:${selectedMember.phone.replace(/\s+/g, '')}` : '#'}
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <PhoneCall size={18} />
                <span>Call Phone Directly</span>
              </a>

              {selectedMember.phone && (
                <a
                  href={`https://wa.me/${selectedMember.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    textDecoration: 'none',
                    borderRadius: 'var(--radius-md)',
                    color: '#22c55e',
                  }}
                >
                  <MessageSquare size={18} />
                  <span>WhatsApp Message</span>
                </a>
              )}

              {selectedMember.email && (
                <a
                  href={`mailto:${selectedMember.email}`}
                  className="btn btn-outline"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px',
                    textDecoration: 'none',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <Mail size={16} />
                  <span>Send Email</span>
                </a>
              )}

              <button
                onClick={() => setIsCallModalOpen(false)}
                className="btn btn-outline"
                style={{ marginTop: '6px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 5: EDIT COMMITTEE (Admin Only) */}
      {isEditCommitteeModalOpen && editingCommittee && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '28px',
              border: '1px solid var(--border-card)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-white)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-dark-brown)', margin: 0 }}>
                  Edit Society Committee
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Update committee name, description, and status
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditCommitteeModalOpen(false);
                  setEditingCommittee(null);
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateCommitteeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.85rem' }}>Committee Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Festival & Celebration Committee"
                  value={editCommitteeFormData.name}
                  onChange={(e) => setEditCommitteeFormData({ ...editCommitteeFormData, name: e.target.value })}
                  className="input-field"
                  style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-sand)' }}
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.85rem' }}>Description / Scope</label>
                <textarea
                  rows={3}
                  placeholder="Describe committee responsibilities..."
                  value={editCommitteeFormData.description}
                  onChange={(e) => setEditCommitteeFormData({ ...editCommitteeFormData, description: e.target.value })}
                  className="input-field"
                  style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-sand)' }}
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.85rem' }}>Status</label>
                <select
                  value={editCommitteeFormData.status}
                  onChange={(e) => setEditCommitteeFormData({ ...editCommitteeFormData, status: e.target.value })}
                  className="input-field"
                  style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-sand)' }}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditCommitteeModalOpen(false);
                    setEditingCommittee(null);
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'var(--color-clay)', display: 'flex', alignItems: 'center', gap: '8px' }}
                  disabled={updatingCommittee}
                >
                  {updatingCommittee && <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  <span>{updatingCommittee ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: DELETE COMMITTEE CONFIRMATION (Admin Only) */}
      {committeeToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '28px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-white)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <Trash2 size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginBottom: '8px' }}>
              Delete Committee?
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete{' '}
              <strong style={{ color: 'var(--color-dark-brown)' }}>"{committeeToDelete.name}"</strong>?
            </p>

            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '0.8rem',
                color: '#b91c1c',
                textAlign: 'left',
                display: 'flex',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Warning:</strong> All members assigned to this committee will be automatically unlinked. This action cannot be undone.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setCommitteeToDelete(null)}
                className="btn btn-outline"
                disabled={deletingCommitteeId !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCommittee}
                className="btn btn-danger"
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                }}
                disabled={deletingCommitteeId !== null}
              >
                {deletingCommitteeId !== null ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete Committee</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
