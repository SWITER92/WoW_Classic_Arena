import sys;sys.path.insert(0,'/tmp/claude-0/-home-claude/5a64b8cb-135a-5093-a670-ac765c96e780/scratchpad/py/mpyq-0.2.5');import mpyq
A=mpyq.MPQArchive('/tmp/claude-0/-home-claude/5a64b8cb-135a-5093-a670-ac765c96e780/scratchpad/as2/AzerothSurvivors/Data/patch.MPQ',listfile=False)
def read(n):
    h=A.get_hash_table_entry(n)
    if h is None:return None
    b=A.block_table[h.block_table_index]
    if b.flags&0x0000FF00==0 and b.size==b.archived_size:
        A.file.seek(A.header['offset']+b.offset);return A.file.read(b.size)
    return A.read_file(n)
